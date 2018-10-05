import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { concatMap, map, takeWhile } from 'rxjs/operators';
import { COMMANDS_POLLING } from './polling-constants';

export interface IncrementalCommandOutput {
  status: 'success' | 'failure' | 'inprogress' | 'terminated';
  outChunk: string;
}

export interface CommandResponse {
  id: string;
  command: string;
  out: string;
  outChunk: string;
  status: 'success' | 'failure' | 'inprogress' | 'terminated';
}

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  readonly activeCommand$ = new BehaviorSubject(false);
  activeCommandId: string;

  constructor(private readonly apollo: Apollo) {}

  runCommand(
    mutation: DocumentNode,
    variables: { [key: string]: any },
    dryRun: boolean
  ): Observable<IncrementalCommandOutput> {
    if (!dryRun) {
      this.activeCommand$.next(true);
    }
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        concatMap((res: any) => {
          const id = (Object.entries(res.data)[0][1] as any).id;

          this.activeCommandId = id;

          return interval(COMMANDS_POLLING).pipe(
            concatMap(() => {
              return this.apollo.query({
                query: gql`
                  query($id: String) {
                    commands(id: $id) {
                      status
                      outChunk
                    }
                  }
                `,
                variables: { id }
              });
            }),
            map((r: any) => r.data.commands[0]),
            concatMap(r => {
              if (r.status !== 'inprogress') {
                if (!dryRun) {
                  this.activeCommand$.next(false);
                }
                return of(r, null);
              } else {
                return of(r);
              }
            }),
            takeWhile(r => !!r)
          );
        })
      );
  }

  listAllCommands(): Observable<CommandResponse[]> {
    return this.apollo
      .watchQuery({
        pollInterval: COMMANDS_POLLING,
        query: gql`
          {
            commands {
              id
              type
              status
              workspace
              command
            }
          }
        `
      })
      .valueChanges.pipe(map((r: any) => r.data.commands));
  }

  getCommand(id: string): Observable<CommandResponse> {
    // TODO: vsavkin refactor it such that we pull "out" once
    return this.apollo
      .watchQuery({
        query: gql`
          query($id: String) {
            commands(id: $id) {
              id
              type
              workspace
              command
              status
              out
              outChunk
            }
          }
        `,
        variables: { id }
      })
      .valueChanges.pipe(map((r: any) => r.data.commands[0]));
  }

  stopCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            stopCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  removeCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            removeCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  restartCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            restartCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  stopActiveCommand() {
    this.stopCommand(this.activeCommandId);
  }
}
