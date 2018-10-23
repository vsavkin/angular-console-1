import { Component, ChangeDetectionStrategy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project } from '@angular-console/schema';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PROJECTS_POLLING } from '@angular-console/utils';
import { WorkspaceGQL } from '../generated/graphql';
import { SankeyComponent } from '@angular-console/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  workspace$: Observable<any>;
  selected: any;
  @ViewChild(SankeyComponent) sankey: SankeyComponent;

  depGraph = {
    deps: {
      'demo-feature-document': [
        {
          projectName: 'common-ui',
          type: 'es6Import'
        },
        {
          projectName: 'demo-state',
          type: 'es6Import'
        }
      ],
      'vndx-feature-project': [
        {
          projectName: 'common-ui',
          type: 'es6Import'
        },
        {
          projectName: 'vndx-state',
          type: 'es6Import'
        },
        {
          projectName: 'common-util',
          type: 'es6Import'
        },
        {
          projectName: 'vndx-ui',
          type: 'es6Import'
        }
      ],
      'common-testing': [],
      'common-styles': [],
      'common-state': [],
      'common-util': [],
      'manda-e2e': [
        {
          projectName: 'manda',
          type: 'implicit'
        }
      ],
      'vndx-state': [
        {
          projectName: 'common-state',
          type: 'es6Import'
        },
        {
          projectName: 'common-testing',
          type: 'es6Import'
        }
      ],
      'demo-state': [
        {
          projectName: 'common-ui',
          type: 'es6Import'
        }
      ],
      'demo-shell': [
        {
          projectName: 'demo-feature-document',
          type: 'es6Import'
        },
        {
          projectName: 'common-ui',
          type: 'es6Import'
        }
      ],
      'vndx-shell': [
        {
          projectName: 'vndx-feature-project',
          type: 'es6Import'
        },
        {
          projectName: 'vndx-state',
          type: 'es6Import'
        }
      ],
      'vndx-util': [],
      'common-ui': [],
      'demo-e2e': [
        {
          projectName: 'demo',
          type: 'implicit'
        }
      ],
      'vndx-e2e': [
        {
          projectName: 'vndx',
          type: 'implicit'
        }
      ],
      'manda-ui': [],
      'vndx-ui': [
        {
          projectName: 'common-state',
          type: 'es6Import'
        },
        {
          projectName: 'common-ui',
          type: 'es6Import'
        }
      ],
      manda: [],
      demo: [
        {
          projectName: 'demo-shell',
          type: 'es6Import'
        }
      ],
      vndx: [
        {
          projectName: 'common-ui',
          type: 'es6Import'
        },
        {
          projectName: 'common-state',
          type: 'es6Import'
        },
        {
          projectName: 'vndx-shell',
          type: 'es6Import'
        }
      ]
    },
    criticalPath: [
      'demo-shell',
      'demo-feature-document',
      'demo-e2e',
      'demo'
    ]
  };
  
  constructor(
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL
  ) {}

  ngOnInit() {
    this.workspace$ = this.route.params.pipe(
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
          const actions = [
            ...createLinkForTask(p, 'serve', 'Serve'),
            ...createLinkForTask(p, 'test', 'Test'),
            ...createLinkForTask(p, 'build', 'Build'),
            ...createLinkForTask(p, 'e2e', 'E2E'),
            ...createLinkForCoreSchematic(p, 'component', 'Generate Component')
          ] as any[];
          return { ...p, actions };
        });
        return { ...w, projects };
      })
    );
  }

  trackByName(p: any) {
    return p.name;
  }

  onNodeSelected(node: any) {
    if (this.selected && this.selected.name === node.name) {
      this.selected = null;
    } else {
      this.selected = node;
    }
    this.sankey.selectNode(this.selected);
  }

  testAffected() {
    console.log("TESTING", this.depGraph.criticalPath.join(', '));
  }
  
  testSelected() {
    console.log("TESTING", this.selected.name);
  }
}

function createLinkForTask(
  project: Project,
  name: string,
  actionDescription: string
) {
  if (project.architect.find(a => a.name === name)) {
    return [{ actionDescription, link: ['../tasks', name, project.name] }];
  } else {
    return [];
  }
}

function createLinkForCoreSchematic(
  project: Project,
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
          '../generate',
          decodeURIComponent('@schematics/angular'),
          name,
          { project: project.name }
        ]
      }
    ];
  } else {
    return [];
  }
}
