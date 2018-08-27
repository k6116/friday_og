import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiDataBomService } from '../../_shared/services/api-data/_index';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import * as d3 from 'd3';

declare var $: any;

@Component({
  selector: 'app-bom-map',
  templateUrl: './bom-map.component.html',
  styleUrls: ['./bom-map.component.css', '../../_shared/styles/common.css']
})
export class BomMapComponent implements OnInit {

  @ViewChild('treeComponent') treeComponent;

  billList: any;  // for getting the list of bills in drop-down
  billListSub: Subscription;
  bill: any;  // for storing the selected bill as flat array

  billHierarchy: any;


  constructor(private apiDataBomService: ApiDataBomService) { }

  ngOnInit() {
    // get list of bills in drop-down
    this.billListSub = this.apiDataBomService.index().subscribe( res => {
      this.billList = res;
    });
  }

  onBomSelect(selected: number) {

    // get the selected BOM as flat array
    const bomSubscription = this.apiDataBomService.showSingleBom(selected).subscribe( res => {


      this.bill = res;
      bomSubscription.unsubscribe();

      // initialize bomtree
      this.billHierarchy = {
        name: this.bill[0].ParentName.length > 19 ? `${this.bill[0].ParentName.slice(0, 20)}...` : this.bill[0].ParentName,
        longName: this.bill[0].ParentName,
        id: this.bill[0].ParentID,
        qty: 1
      };

      // using async/await to wait for BOM parser to finish
      const bomSetup = async () => {
        // recursively parse the BOM structure
        const jsonBom = await this.bomTraverse(0, 1);

        // add the recursive output as 'children' property of the tree nodeStructure
        this.billHierarchy.children = jsonBom.nextLvData;
        console.log('finalized bom structure');
        console.log(this.billHierarchy);

        // kill any existing plots within the container, and then draw
        d3.select('#d3-container').selectAll('*').remove();
        this.drawD3Plot();
      };

      // execute our async function
      bomSetup();
    });

  }

  bomTraverse(i: number, lv: number) {
    // i = index of the array to start traversing (usu 0)
    // lv - initial level of the BOM (usu 1)
    const children = [];
    while (i < this.bill.length) {
      if (this.bill[i].Level === lv) {
        // traverse down and collect all the siblings in this level
        let newNode: any;
        newNode = {
          name: this.bill[i].ChildName.length > 19 ? `${this.bill[i].ChildName.slice(0, 20)}...` : this.bill[i].ChildName,
          longName: this.bill[i].ChildName,
          qty: this.bill[i].QtyPer,
          id: this.bill[i].ChildID
        };
        children.push(newNode);
        i++;
      } else if (this.bill[i].Level > lv) {
        // if the next record is a child, recurse
        // when we return to this level, continue traversing from the farthest-reached index
        const output = this.bomTraverse(i, lv + 1);
        const lastIndex = children.length - 1;
        children[lastIndex].children = output.nextLvData;
        i = Number(output.nextRow);
      } else if (this.bill[i].Level < lv) {
        // if the next record is a parent, return the complete set of nested children
        // and the next value to continue traversing at
        return {
          nextRow: i,
          nextLvData: children
        };
      }
    } // end while
    return {
      nextRow: i,
      nextLvData: children
    };
  } // end bomTraverse



  drawD3Plot() {

    // Set the dimensions and margins of the diagram
    const origin = {top: 200, left: 180};
    const nodeSize = {height: 28, width: 20};
    const zoomSpeed = 1500; // some number between 400 and 2000

    // set custom zoom settings
    const zoom = d3.zoom()
      .scaleExtent([0.25, 4])  // restrict zoom to this scale range
      // .translateExtent([[20, 20], [width, height]])  // restict panning to this [x0, y0] [x1, y1] range
      .wheelDelta(() => {
        // custom wheel delta function to reduce zoom speed
        return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1) / zoomSpeed;
      })
      .on('zoom', () => {
        // when zoomed, actually perform the transform on the 'svg' object using d3.event.transform
        svg.attr('transform', d3.event.transform);
      });


    // append the svg object to the body of the page and appends a 'group' container element to 'svg'
    // moves the 'group' element to the top left margin
    const svg = d3.select('#d3-container').append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .call(zoom)
      .append('g')
      .attr('transform', `translate(${origin.left}, ${origin.top})`);


    let i = 0;
    const duration = 750;

    // declares a tree layout and assigns the size
    // const treemap = d3.tree().size([height, width]);
    const treemap = d3.tree().nodeSize([nodeSize.height, nodeSize.width]);

    // Assigns data for root node, and the starting location of the root node
    const root = d3.hierarchy(this.billHierarchy);
    root.x0 = 0;
    root.y0 = 0;

    update(root);

    // describes how to collapse a node and all its children
    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    function update(source) {

      // Assigns the x and y position for the nodes
      const treeData = treemap(root);

      // Compute the new tree layout.
      const nodes = treeData.descendants();
      const links = treeData.descendants().slice(1);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // ****************** Nodes section ***************************

      // Update the nodes...
      const node = svg.selectAll('g.node')
        .data(nodes, function(d) {return d.id || (d.id = ++i); });

      // Enter any new modes at the parent's previous position.
      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', function(d) {
          return 'translate(' + source.y0 + ',' + source.x0 + ')';
      })
      .on('click', click);

      // Add Circle for the nodes
      nodeEnter.append('rect')
        .attr('class', 'node')
        .attr('width', (d) => Math.max(75, 48 + 5 * d.data.name.length))
        .attr('height', 20)
        .attr('x', -8)
        .attr('y', -11)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('cursor', 'pointer')
        .style('stroke-width', 1)
        .style('stroke', '#aaf')
        .style('fill', (d) => d._children ? 'lightsteelblue' : '#fff');

      // Add labels for the nodes
      nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('cursor', 'pointer')
        .attr('text-anchor', 'start')
        .text(function(d) { return `${d.data.qty}x ${d.data.name}`; });

      // UPDATE
      const nodeUpdate = nodeEnter.merge(node);

      // Transition to the proper position for the node
      nodeUpdate.transition()
      .duration(duration)
      .attr('transform', function(d) {
          return 'translate(' + d.y + ',' + d.x + ')';
      });

      // Update the node attributes and style
      nodeUpdate.select('rect.node')
      .attr('width', (d) => Math.max(75, 48 + 5 * d.data.name.length))
      .attr('height', 20)
      .attr('x', -8)
      .attr('y', -11)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('cursor', 'pointer')
      .style('fill', (d) => d._children ? 'lightsteelblue' : '#fff');


      // Remove any exiting nodes
      const nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', (d) => `translate(${source.y},${source.x})`)
        .remove();

      // On exit reduce the node circles size to 0
      nodeExit.select('rect')
      .attr('width', 1e-6)
      .attr('height', 1e-6);

      // On exit reduce the opacity of text labels
      nodeExit.select('text')
      .style('fill-opacity', 1e-6);

      // ****************** links section ***************************

      // Update the links...
      const link = svg.selectAll('path.link')
        .data(links, (d) => d.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', function(d) {
          const o = {x: source.x0, y: source.y0};
          return diagonal(o, o);
        });

      // UPDATE
      const linkUpdate = linkEnter.merge(link);

      // Transition back to the parent element position
      linkUpdate.transition()
        .duration(duration)
        .attr('d', function(d) { return diagonal(d, d.parent); });

      // Remove any exiting links
      const linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function(d) {
          const o = {x: source.x, y: source.y};
          return diagonal(o, o);
        })
        .remove();

      // Store the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Creates a curved (diagonal) path from parent to the child nodes
      function diagonal(s, d) {
        const path = `M ${s.y} ${s.x}
              C ${(s.y + d.y) / 2} ${s.x},
                ${(s.y + d.y) / 2} ${d.x},
                ${d.y} ${d.x}`;
        return path;
      }

      // Toggle children on click
      function click(d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }
    }
  }
}
