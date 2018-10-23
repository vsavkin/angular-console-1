import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { format } from 'd3-format';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { scaleOrdinal } from 'd3-scale';
import { schemePaired } from 'd3-scale-chromatic';
import { select } from 'd3-selection';

function depGraphToSankey(d: any) {
  const graph = { nodes: [] as any[], links: [] as any[]};
  const entriesArray: any[] = Object.entries(d.deps);
  const indices = {} as any;

  entriesArray.forEach((value, i) => (indices[value[0]] = i));
  entriesArray.forEach((project, i) => {
    graph.nodes.push({name: project[0]});

    project[1].forEach((dep: any) => {
      graph.links.push({
        source: i,
        target: indices[dep.projectName],
        value: 1
      });
    });
  });

  return graph;
}

function highlightLink(id: string, opacity: number): void {
  select('#link-' + id).style('stroke-opacity', opacity);
}

@Component({
  selector: 'ui-sankey',
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" (window:resize)="onResize($event)" width="800" height="700" id="chart_svg" #svg></svg>
  `,
  styles: ['.links {}', '.nodes {}'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SankeyComponent implements OnInit, OnChanges {
  sankey: any;
  link: any;
  svg: any;
  node: any;
  nodeText: any;
  g: any;
  x: any;
  y: any;

  private _sankeyData: any = { links: [], nodes: [] };
  private _data: any;
  
  
  private options = {
    height: 600,
    width: 700,
    margin: { top: 20, right: 30, bottom: 10, left: 40 }
  };

  @Input()
  set data(data: any) {
    this._data = data;
    this._sankeyData = depGraphToSankey(data);
  }

  @Output() readonly nodeSelected = new EventEmitter<any>();

  @ViewChild('svg') private svgEl: ElementRef;

  ngOnInit() {
    this.svg = select(this.svgEl.nativeElement);

    this.sankey
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [this.options.width - 1, this.options.height - 6]]);

    this.link = this.svg
      .append('g')
      .attr('class', 'links')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)
      .selectAll('path');

    this.node = this.svg
      .append('g')
      .attr('class', 'nodes')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .selectAll('g');

    this.onResize();
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data.currentValue !== changes.data.previousValue) {
      if (changes.data.previousValue) {
        this.onResize();
        this.render();
      }
    }
  }

  onResize(): void {
    this.options.width = this.el.nativeElement.offsetWidth;
  }

  /**
   * Anything that needs to change when input data updates
   */
  render(): void {
    this.sankey(this._sankeyData);

    this.link
      .data(this._sankeyData.links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('id', function(d: any, i: any) {
        d.id = i;
        return 'link-' + i;
      })
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .exit()
      .remove()
      .append('title')
      .text((d: any) => d.source.name + ' → ' + d.target.name + '\n');

    this.g = this.node
      .data(this._sankeyData.nodes)
      .enter()
      .append('g');
    this.node.exit().remove();
    this.node = this.g
      .append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => this.color(d.name.replace(/ .*/, ''))) // If you want to define node colors according to a rule, ex: libs/apps, change here.
      .attr('stroke', '#000')
      .attr('class', 'node')
      .attr('id', (d: any) => d.name)
      .on('click', (node: any) => this.onNodeClick(node));

    this.nodeText = this.g
      .append('text')
      .attr('x', (d: any) => d.x0 - 6)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d: any) => d.name)
      .filter((d: any) => d.x0 < this.options.width / 2)
      .attr('x', (d: any) => d.x1 + 6)
      .attr('text-anchor', 'start');

    this.nodeText.append('title').text((d: any) => d.name + '\n' + format(d.value));
  }

  onNodeClick(node: any) {
    this.nodeSelected.emit(node);
  }

  selectNode(node: any) {
    this.deselectAll();
    if (node) {
      this.selectNodeAndItsDeps(node);
    }
  }
    
  private color(node: string) {
    if (this._data.criticalPath.indexOf(node) > -1) {
      return 'red';
    } else {
      return scaleOrdinal(schemePaired)(node);
    }
  }

  private selectNodeAndItsDeps(node: any) {
    const traverse = [
      {
        linkType: 'sourceLinks',
        nodeType: 'target'
      },
      {
        linkType: 'targetLinks',
        nodeType: 'source'
      }
    ];

    let remainingNodes = [] as any[];
    let nextNodes = [] as any[];
    const el: any = select('#' + node.name);
    el.attr('data-clicked', '1');
    el.attr('fill', 'green');

    traverse.forEach(step => {
      node[step.linkType].forEach((link: any) => {
        remainingNodes.push(link[step.nodeType]);
        highlightLink(link.id, 0.5);
      });

      while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(n => {
          n[step.linkType].forEach((link: any) => {
            nextNodes.push(link[step.nodeType]);
            highlightLink(link.id, 0.5);
          });
        });
        remainingNodes = nextNodes;
      }
    });
  }

  private deselectAll() {
    this._sankeyData.nodes.forEach((node: any) => {
      const el: any = select('#' + node.name);
      el.attr('data-clicked', '0');
      el.attr('fill', this.color(node.name.replace(/ .*/, '')));
    });
    this._sankeyData.links.forEach((link: any) => {
      highlightLink(link.id, 0.2);
    });
  }

  constructor(private el: ElementRef) {
    this.sankey = sankey();
  }
}
