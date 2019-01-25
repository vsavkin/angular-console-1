import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project } from '@angular-console/schema';
import { combineLatest, Observable, of } from 'rxjs';
import { map, startWith, switchMap, shareReplay } from 'rxjs/operators';
import { PROJECTS_POLLING, CommandRunner } from '@angular-console/utils';
import { WorkspaceGQL } from '../generated/graphql';
import { FormControl } from '@angular/forms';
import { GROW_SHRINK } from '@angular-console/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-deploy',
  templateUrl: './deploy.component.html',
  styleUrls: ['./deploy.component.scss'],
  animations: [GROW_SHRINK]
})
export class DeployComponent implements OnInit {
  projects$: Observable<any>;
  filteredProjects$: Observable<any>;

  projectFilterFormControl = new FormControl();

  viewportHeight$ = this.commandRunner.listAllCommands().pipe(
    map(c => Boolean(c.length > 0)),
    map(actionBarExpanded =>
      actionBarExpanded ? 'calc(100vh - 194px)' : 'calc(100vh - 128px)'
    ),
    shareReplay()
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL,
    private readonly commandRunner: CommandRunner
  ) {}

  ngOnInit() {
    this.projects$ = this.route.params.pipe(
      map(m => m.path),
      switchMap(path => {
        return this.workspaceGQL.watch(
          {
            path
          },
          {
            pollInterval: PROJECTS_POLLING
          }
        ).valueChanges;
      }),
      map((r: any) => {
        const w = r.data.workspace;
        const projects = w.projects.map((p: any) => {
          return { ...p, actions: this.createActions(p) };
        });
        return projects;
      })
    );

    this.filteredProjects$ = combineLatest(
      this.projectFilterFormControl.valueChanges.pipe(
        startWith(''),
        map(value => value.toLowerCase())
      ),
      this.projects$
    ).pipe(
      map(([lowerCaseFilterValue, projects]) => {
        return groupBy(
          getBuilderName,
          projects.filter((project: Project) =>
            project.name.includes(lowerCaseFilterValue)
          )
        );
      })
    );
  }

  private createActions(p: any) {
    const builderName = getBuilderName(p);
    if (builderName === '@nrwl/azure:deploy') {
      return [
        ...createLinkForTask(p, 'deploy', 'Deploy'),
        ...createLinkForSchematic(p, '@nrwl/azure', 'appconfig', 'Add Config'),
        ...createLinkForSchematic(p, '@nrwl/azure', 'cosmosdb', 'Add Cosmos DB')
      ] as any[];
    }
    if (builderName === '@nrwl/builders:node-build') {
      return [
        ...createLinkForSchematic(p, '@nrwl/azure', 'appconfig', 'Add Config')
      ] as any[];
    }
    return [];
  }

  trackByName(p: any) {
    return p.name;
  }
}

function createLinkForTask(
  project: Project,
  name: string,
  actionDescription: string
) {
  console.log(project);
  if (project.architect.find(a => a.name === name)) {
    return [
      { actionDescription, link: ['../../../tasks', name, project.name] }
    ];
  } else {
    return [];
  }
}

function createLinkForSchematic(
  project: Project,
  schematicName: string,
  name: string,
  actionDescription: string
) {
  if (
    (project.projectType === 'application' ||
      project.projectType === 'library') &&
    !project.architect.find(a => a.name === 'e2e')
  ) {
    return [
      {
        actionDescription,
        link: [
          '../../../generate',
          decodeURIComponent(schematicName),
          name,
          { project: project.name }
        ]
      }
    ];
  } else {
    return [];
  }
}

interface ArrayMap<T> {
  [key: string]: T[];
}
function groupBy<T>(groupFn: (item: T) => string, items: T[]): ArrayMap<T> {
  return items.reduce((grouped: ArrayMap<T>, item) => {
    const key = groupFn(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
    return grouped;
  }, {});
}
function getBuilderName(project: Project) {
  const azureBuilder = project.architect.find(schema =>
    schema.builder.startsWith('@nrwl/azure')
  );
  if (azureBuilder) {
    return azureBuilder.builder;
  }
  const nodeBuilder = project.architect.find(
    schema => schema.builder === '@nrwl/builders:node-build'
  );
  if (nodeBuilder) {
    return nodeBuilder.builder;
  }
  return 'other';
}
