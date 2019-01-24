import { Project } from '@angular-console/schema';
import {
  FlagsComponent,
  TaskRunnerComponent,
  CommandOutputComponent
} from '@angular-console/ui';
import {
  IncrementalCommandOutput,
  CommandRunner,
  Serializer,
  Settings
} from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { ProjectsGQL, RunNgGQL, SchematicDocsGQL } from '../generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-target',
  templateUrl: './target.component.html',
  styleUrls: ['./target.component.css']
})
export class TargetComponent implements OnInit {
  project$: Observable<Project>;
  commandArray$ = new BehaviorSubject<{ commands: string[]; valid: boolean }>({
    commands: [],
    valid: true
  });
  commandArrayObs$ = this.commandArray$.pipe(
    map(c => {
      if (c.commands.length < 2) {
        return c;
      }
      const [task, project, ...rest] = c.commands;
      return {
        ...c,
        commands: ['run', `${project}:${task}`, ...rest]
      };
    })
  );
  command$: Observable<string>;
  commandOutput$: Observable<IncrementalCommandOutput>;
  @ViewChild(CommandOutputComponent) out: CommandOutputComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent) flags: FlagsComponent;

  docs$: Observable<any[]> = of();

  private readonly ngRun$ = new Subject<any>();
  private readonly ngRunDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly runner: CommandRunner,
    private readonly serializer: Serializer,
    private readonly contextActionService: ContextualActionBarService,
    private readonly projectsGQL: ProjectsGQL,
    private readonly runNgGQL: RunNgGQL,
    private readonly settings: Settings,
    private readonly schematicDocsGQL: SchematicDocsGQL
  ) {}

  ngOnInit() {
    const targetDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.target || !p.project) return null;
        return {
          target: decodeURIComponent(p.target),
          project: decodeURIComponent(p.project),
          path: p.path
        };
      })
    );

    this.project$ = targetDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
        }
        if (this.out) {
          this.out.reset();
        }

        return this.projectsGQL.fetch(p);
      }),
      map((r: any) => {
        const project: Project = r.data.workspace.projects[0];
        const architect = project.architect.map(a => ({
          ...a,
          schema: this.serializer.normalizeTarget(a.builder, a.schema)
        }));
        return {
          ...project,
          architect
        };
      }),
      tap((project: Project) => {
        const contextTitle = this.getContextTitle(project);

        this.contextActionService.contextualActions$.next({
          contextTitle,
          actions: [
            {
              invoke: this.ngRun$,
              disabled: this.ngRunDisabled$,
              name: 'Run'
            }
          ]
        });
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngRun$.pipe(
      withLatestFrom(this.commandArrayObs$),
      tap(() => {
        this.flags.hideFields();
        this.taskRunner.terminalVisible$.next(true);
      }),
      switchMap(([_, c]) => {
        console.log(c.commands.join());
        this.out.reset();
        return this.runner.runCommand(
          this.runNgGQL.mutate({
            path: this.path(),
            runCommand: c.commands
          }),
          false,
          this.out.terminal.currentCols
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArrayObs$.pipe(
      map(c => `ng ${this.serializer.argsToString(c.commands)}`)
    );
  }

  getContextTitle(project: Project) {
    return `ng ${project.name}:${project.architect[0].name}`;
  }

  path() {
    return this.route.snapshot.params.path;
  }

  onRun() {
    this.ngRun$.next();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    console.log(e);
    setTimeout(() => this.commandArray$.next(e), 0);
    this.ngRunDisabled$.next(!e.valid);
  }
}
