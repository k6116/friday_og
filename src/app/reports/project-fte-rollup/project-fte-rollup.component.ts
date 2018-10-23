import { Component, OnInit, AfterViewInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { ApiDataReportService, ApiDataProjectService } from '../../_shared/services/api-data/_index';
import { ToolsService } from '../../_shared/services/tools.service';

declare var require: any;
declare var $: any;
import * as moment from 'moment';
import * as _ from 'lodash';
import * as Highcharts from 'highcharts';
require('highcharts/modules/drilldown.js')(Highcharts);
require('highcharts/modules/heatmap.js')(Highcharts);
require('highcharts/modules/treemap.js')(Highcharts);
require('highcharts/modules/data.js')(Highcharts);
require('highcharts/modules/no-data-to-display.js')(Highcharts);
require('highcharts/highcharts-more.js')(Highcharts);


@Component({
  selector: 'app-project-fte-rollup',
  templateUrl: './project-fte-rollup.component.html',
  styleUrls: ['./project-fte-rollup.component.css', '../../_shared/styles/common.css']
})
export class ProjectFteRollupComponent implements OnInit, AfterViewInit {

  @ViewChild('testButtonVC') testButtonVC: ElementRef;

  data: any;
  chartOptions: any;
  chart: any;
  fteData: any;
  levelOneData: any;
  childProjects: any = [];
  chartData: any;
  drillLevel: number;
  drillHistory: any = [];
  drillDownIDs: any = [];
  drillDownTitles: any = [];
  tableData: any = [];
  displayTable: boolean;
  maxFTE: number;
  barMultiplier: number;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.resizeChart();
  }


  constructor(
    private apiDataReportService: ApiDataReportService,
    private apiDataProjectService: ApiDataProjectService,
    private toolsService: ToolsService
  ) {

    this.drillLevel = 0;

  }

  ngOnInit() {

    this.getProjectsListData();

    // this.renderTestChart();
    this.renderLokiChart();


  }

  ngAfterViewInit() {

    // $('g.highcharts-button.highcharts-drillup-button').click(function() {
    //   console.log('drill up button clicked');
    // });

  }


  resizeChart() {

    // reflow the charts to its container during window resize
    if (this.chart) {
      this.chart.reflow();
    }
    this.calculateBarMultipler();

  }


  getProjectsListData() {

    this.apiDataProjectService.getProjectsList()
    .subscribe(
      res => {
        console.log('projects list data:');
        console.log(res);
      },
      err => {
        console.error('attempt to get projects list data returned error:');
        console.log(err);
      });

  }



  renderLokiChart() {

    // get the current fiscal quarter's date range (array of two strings in the format 'MM-DD-YYYY')
    const fiscalQuarterRange = this.toolsService.fiscalQuarterRange(moment(), 'MM-DD-YYYY');

    this.apiDataReportService.getProjectFTERollupData(1033, fiscalQuarterRange[0], fiscalQuarterRange[1])
    .subscribe(res => {
      this.fteData = res;
      console.log('response');
      console.log(res);

      const project = $.extend(true, {}, res[0]);
      project.Level = 0;
      project.ParentID = 1;
      project.ChildName = project.ParentName;

      console.log('first project object:');
      console.log(project);

      this.fteData.splice(0, 0, project);

      console.log('fte data after adding first project:');
      console.log(this.fteData);

      // this.setLevelOneData(res);
      // const testProject = this.levelOneData[2];
      // console.log('test project');
      // console.log(testProject);

      const firstLevelItem = {
        id: project.ParentID.toString(),
        name: project.ParentName,
        fte: 0,
        value: 0,
        entity: project.ParentEntity,
        type: project.ParentType,
        level: 0
      };

      console.log('first level chart object');
      console.log(firstLevelItem);

      this.childProjects.push(firstLevelItem);

      // this.levelOneData.forEach((project, index) => {

      //   const chartItem = {
      //     id: project.ChildID.toString(),
      //     name: project.ChildName,
      //     value: project.TotalFTE,
      //     type: project.ChildEntity,
      //     level: project.Level,
      //     color: Highcharts.getOptions().colors[index]
      //   };
      //   this.childProjects.push(chartItem);

      //   this.getChildProjects(project, chartItem);

      // });

      const t0 = performance.now();

      this.getChildProjects(project, firstLevelItem);

      const t1 = performance.now();
      console.log(`get child projects took: ${t1 - t0} milliseconds`);

      console.log('child projects (explode projects bom):');
      console.log(this.childProjects);

      // const t3 = performance.now();

      // console.log(this.childProjects[3]);
      // this.rollupFTEValues(this.childProjects[3], this.childProjects[3]);
      // console.log('test total for project at index 3:');
      // console.log(this.childProjects[3].value);
      // console.log(this.childProjects[3]);

      // const t4 = performance.now();
      // console.log(`rollup fte value took: ${t4 - t3} milliseconds`);

      const t3 = performance.now();

      // rollup values for all chart point objects
      this.childProjects.forEach(project => {
        this.rollupFTEValues(project, project);
      });

      const t4 = performance.now();
      console.log(`rollup all fte values took: ${t4 - t3} milliseconds`);

      console.log('chart point objects with rolled up values');
      console.log(this.childProjects);

      // filter chart point objects to level 1 again
      const levelOneProjects = this.childProjects.filter(project => {
        return project.level === 0;
      });

      console.log('level one objects:');
      console.log(levelOneProjects);

      const t5 = performance.now();

      // update the parent ids for child projects
      levelOneProjects.forEach(project => {
        this.updateParentIDs(project);
      });

      const t6 = performance.now();
      console.log(`update parent ids took: ${t6 - t5} milliseconds`);

      console.log('chart point objects with updated parent ids');
      console.log(this.childProjects);

      // filter chart point objects to only Projects with values
      this.chartData = this.childProjects.filter(project => {
        return project.entity === 'Project' && project.value;
      });

      this.setLevelZeroColor();

      // this.setLevelOneColors();

      this.sortData();

      this.updateLevels2();

      this.setBulletColors();

      this.pushLevelOneItemIntoTable();

      this.getHighestFTE();

      console.log('final chart data');
      console.log(this.chartData);

      // set the chart options
      console.log('setting the chart options');
      this.setChartOptions();

      // render the chart
      console.log('rendering the chart');
      this.renderChart();

    },
    err => {
      console.log(err);
    });

  }


  setLevelOneData(fteData: any) {

    this.levelOneData = fteData.filter(data => {
      return data.Level === 1;
    });

    console.log(this.levelOneData);

  }

  getChildProjects(project: any, chartItem: any) {

    const parentTree = project.ParentTree;

    this.fteData.forEach(project1 => {

      const childTree = project1.ParentTree.split(' > ').splice(0, project1.ParentTree.split(' > ').length - 1).join(' > ');

      if ((project1.ParentID === project.ChildID && parentTree === childTree) || project.Level === 0 && project1.Level === 1)  {
        // console.log('found child project');
        // console.log(project1.ChildID + ': ' + project1.ChildName );
        // console.log('parent tree: ' + project.ParentTree);
        // console.log('child tree: ' + childTree);

        const obj = {
          id: chartItem.id + '_' + project1.ChildID,
          name: project1.ChildName,
          fte: project1.TotalFTE ? project1.TotalFTE : 0,
          value: project1.TotalFTE,
          parent: chartItem.id,
          type: project1.ChildType,
          entity: project1.ChildEntity,
          level: project1.Level
        };

        // chartItem.value += project1.TotalFTE;

        // console.log(project.ChildID);
        this.childProjects.push(obj);
        this.getChildProjects(project1, obj);
        return;
      }
    });

  }


  rollupFTEValues(projectToUpdate: any, projectToRecurse: any) {

    this.childProjects.forEach(project => {
      // console.log(`project 1 parent: ${project1.parent}, project id: ${project.id}`);
      if (project.parent === projectToRecurse.id) {
        projectToUpdate.value += project.value ? project.value : 0;
        // console.log(`found child project named ${project.name}, adding ${project.value ? project.value : 0} to value`);
        // console.log(`current total is: ${projectToUpdate.value}`);
        this.rollupFTEValues(projectToUpdate, project);
      }
    });

  }

  updateParentIDs(project: any, parentID?: number) {

    this.childProjects.forEach(project1 => {
      if (project1.parent === project.id) {
        // store the parent id to cascade down to the child projects, skipping the parts
        if (project.entity === 'Project') {
          parentID = project.id;
          // console.log(`storing id for project ${project.name}: ${parentID}`);
        }
        if (project1.entity === 'Project') {
          // console.log(`updating project ${project1.name}'s parent id to ${parentID}`);
          project1.parent = parentID;
        }
        this.updateParentIDs(project1, parentID);
      }
    });

  }


  setLevelZeroColor() {

    const levelZeroProjects = this.childProjects.filter(childProject => {
      return childProject.level === 0;
    });

    levelZeroProjects.forEach((levelZeroProject, index) => {
      levelZeroProject.color = Highcharts.getOptions().colors[0];
    });

  }

  setLevelOneColors() {

    const levelOneProjects = this.childProjects.filter(childProject => {
      return childProject.level === 1;
    });

    levelOneProjects.forEach((levelOneProject, index) => {
      levelOneProject.color = Highcharts.getOptions().colors[index];
    });

  }


  sortData() {


    this.chartData = _.orderBy(this.chartData, ['level', 'parent', 'value', ], ['asc', 'asc', 'desc']);
    console.log('chart data after sort:');
    console.log(this.chartData);

  }


  updateLevels() {

    let newLevel = 0;
    let formerLevel;
    this.chartData.forEach(data => {
      if (data.level === 0 || data.level > formerLevel) {
        formerLevel = data.level;
        newLevel++;
      }
      data.level = newLevel;
    });

    console.log('chart data after update levels:');
    console.log(this.chartData);

  }


  updateLevels2() {

    this.chartData.forEach(data => {
      if (data.hasOwnProperty('parent')) {
        const parentSegments = data.parent.split('_').length;
        data.level = parentSegments + 1;
      } else {
        if (data.level === 0) {
          data.level = 1;
        }
      }
    });

    console.log('chart data after update levels:');
    console.log(this.chartData);

  }

  setBulletColors() {

    let colorIndex = 0;
    this.chartData.forEach(data => {
      if (data.level === 1) {
        data.bulletColor = Highcharts.getOptions().colors[0];
      } else if (data.level === 2) {
        data.bulletColor = Highcharts.getOptions().colors[colorIndex];
        colorIndex++;
      } else {
        const foundParent = this.chartData.find(parent => {
          return parent.id === data.parent;
        });
        if (foundParent) {
          data.bulletColor = foundParent.bulletColor;
        }
      }
    });

    console.log('chart data after update colors:');
    console.log(this.chartData);

  }


  getHighestFTE() {

    let maxFTE = 0;
    this.chartData.forEach(data => {
      if (data.value > maxFTE) {
        maxFTE = data.value;
      }
    });
    this.maxFTE = maxFTE;

    console.log('max fte:');
    console.log(this.maxFTE);

  }


  pushLevelOneItemIntoTable() {

    const levelOneItem = this.chartData.filter(data => {
      return data.level === 1;
    });

    if (levelOneItem.length) {
      // this.tableData.push(levelOneItem[0]);
      this.tableData.splice(0, 0, ...levelOneItem);
      this.tableData[0].highlight = true;
    }

    console.log('this.tableData:');
    console.log(this.tableData);

  }


  pushChildItemsIntoTable(parentID) {

    console.log('existing table data:');
    console.log(`looking for data.id: ${parentID}`);
    console.log(this.tableData);

    // find the position/index of the parentID in the table
    // so that the child items can be spliced in, in the proper location
    let tableRow = 0;
    this.tableData.forEach((data, index) => {
      console.log(`data.id: ${data.id.toString()}; parentID: ${parentID.toString()}`);
      if (data.id.toString() === parentID.toString()) {
        tableRow = index + 1;
        console.log(`found match at row: ${tableRow}`);
      }
    });

    console.log('row of clicked item in table:');
    console.log(tableRow);

    // remove all existing highlighted rows
    // this.removeAllRowHighlights();

    const childItems = this.chartData.filter(data => {
      return data.parent === parentID;
    });

    // childItems.forEach(item => {
    //   item.highlight = true;
    // });

    console.log('child items:');
    console.log(childItems);

    // add the child items to the table, below the parent item
    if (childItems.length) {
      // this.tableData.push(childItems[0]);
      this.tableData.splice(tableRow, 0, ...childItems);
      // a1.splice(2, 0, ...a2);
    }

    console.log('new table data:');
    console.log(this.tableData);

  }


  pushChildIDsIntoHistory(parentID) {

    // filter to get child items
    const childItems = this.chartData.filter(data => {
      return data.parent === parentID;
    });

    const idArray: number[] = [];
    childItems.forEach(item => {
      idArray.push(item.id);
    });
    console.log('ids array:');
    console.log(idArray);

    this.drillDownIDs.push(idArray);

    console.log('drill down ids array:');
    console.log(this.drillDownIDs);

  }


  removeChildItemsFromTable() {

    // get the last array of drill down ids
    const tableIds = this.drillDownIDs[this.drillDownIDs.length - 1];

    console.log('table ids to remove from table:');
    console.log(tableIds);

    // loop through the table data in reverse order
    for (let i = this.tableData.length - 1; i >= 0; i--) {
      if (tableIds.includes(this.tableData[i].id)) {
        console.log(`found table id to remove at index: ${i}`);
        this.tableData.splice(i, 1);
      }
    }

    // remove the last table ids array
    this.drillDownIDs.pop();

    console.log('new table data with removed children:');
    console.log(this.tableData);

  }


  pushTitlesIntoHistory(title) {

    this.drillDownTitles.push(title);

    console.log('titles array after push:');
    console.log(this.drillDownTitles);

  }

  removeTitlesFromHistory() {

    // remove the last title from the array
    this.drillDownTitles.pop();

    console.log('titles array after pop:');
    console.log(this.drillDownTitles);

  }


  highlightDisplayedItems(parentID, level?) {

    // remove all existing highlighted rows
    this.removeAllRowHighlights();

    const childItems = this.chartData.filter(data => {
      if (level) {
        return data.level === level;
      } else {
        return data.parent === parentID;
      }
    });

    childItems.forEach(item => {
      item.highlight = true;
    });

  }


  removeAllRowHighlights() {

    this.tableData.forEach(row => {
      row.highlight = false;
    });


  }


  calculateBarMultipler() {

    // get the width of the bar column
    const colWidth = $('th.col-spark-bar').outerWidth();

    // console.log('column width:');
    // console.log(colWidth);

    // divide the width in pixels by the max number of cumulative ftes
    const multiplier1 = colWidth / this.maxFTE;

    // console.log('multiplier1:');
    // console.log(multiplier1);

    // subtract 30% to allow for some padding
    const multiplier2 = this.toolsService.roundTo((multiplier1 - (multiplier1 * 0.33)), 0);

    // console.log('multiplier2:');
    // console.log(multiplier2);

    // set the bar multiplier
    this.barMultiplier = multiplier2;

    // console.log('bar multiplier:');
    // console.log(this.barMultiplier);

  }



  setChartOptions() {

    const that = this;

    this.chartOptions = {
      chart: {
        // height: 600,
        events: {
          load: function (e) {
            console.log('chart is loaded');
            that.displayTable = true;

            setTimeout(() => {
              that.calculateBarMultipler();
            }, 0);
          }
        }
      },
      plotOptions: {
        series: {
          animation: true
        }
      },
      // tooltip: {
      //   formatter: function () {
      //     return 'The value for <b>sadfas</b>';
      //   }
      // },
      series: [{
        type: 'treemap',
        layoutAlgorithm: 'squarified',  // sliceAndDice, stripes, squarified or strip
        layoutStartingDirection: 'vertical',
        allowDrillToNode: true,
        interactByLeaf: false,
        animationLimit: 1000,
        stickyTracking: true,
        enableMouseTracking: true,
        // tooltip: {
        //   followPointer: true
        // },
        dataLabels: {
          enabled: false
        },
        // tooltip: {
        //   pointFormatter: function () {
        //     return `<b>{point.name}</b>: {point.value}<br/> YES!`;
        //   }
        // },
        levelIsConstant: false,
        levels: [{
          level: 1,
          dataLabels: {
            enabled: true,
            style: {
              color: 'contrast',
              fontSize: '12px',
              fontWeight: 'bold',
              textOutline: false
            }
          },
          borderWidth: 3
        }],
        events: {
          click: function(e) {
            console.log('CLICK FUNCTION TRIGGERED');
            // if (1 === 1) {
            //   throw {error: 'dont drill down'};
            // }

            const tableData = $.extend(true, [], that.tableData);
            console.log('table data:');
            console.log(tableData);

            console.log(`clicked on ${e.point.name}; id ${e.point.id}`);
            console.log(e.point);

            if (that.checkClickedItemIsInChart(e.point.id, tableData)) {
              console.log('clicked item IS in the chart');

            // console.log(e);
            // console.log(e.point.level);
            // console.log('this');
            // console.log(this);
            // console.log('rootNode:');
            // const rootNode = this.chart.series[0].rootNode;
            // console.log(rootNode);
            // const drillDownColors = ['#7cb5ec', '#90ed7d', '#91e8e1', '#f45b5b', '#2b908f',
            //   '#7cb5ec', '#e4d354', '#434348', '#8085e9', '#f15c80'];
            let colorIndex = 0;
            for (let i = 0; i < this.data.length; i++) {
              if (this.data[i].level === 2) {
                const pointColor = Highcharts.getOptions().colors[colorIndex];
                this.data[i].update({
                  // color: drillDownColors[colorIndex]
                  color: pointColor
                });
                // console.log(`color for ${e.point.name} is ${pointColor}`);
                colorIndex++;
                that.chartData.color = pointColor;
              }
            }
            // this.chart.title.text = 'Project FTEs for Loki Program';

            let drilledDown = false;

            // console.log('test of that');
            // console.log(that.chartData);
            if (e.point.node.children.length) {
              drilledDown = true;
              // that.drillHistory.push({
              //   level: e.point.level,
              //   id: e.point.id,
              //   name: e.point.name
              // });
            }

            if (drilledDown) {

              console.log('e.point:');
              console.log(e.point);

              this.chart.setTitle({text: `FTEs for ${e.point.name} ${e.point.type}`});

              console.log(`chart title: ${this.chart.title.textStr}`);

              that.pushChildItemsIntoTable(e.point.id);

              that.pushChildIDsIntoHistory(e.point.id);

              that.pushTitlesIntoHistory(this.chart.title.textStr);

              that.highlightDisplayedItems(e.point.id);

            }

            // console.log('drill history:');
            // console.log(that.drillHistory);

            // console.log('updated data');
            // console.log(this.data);
          } else {
            console.log('clicked item is NOT in the chart');
            throw {error: 'dont drill down'};
          }

          }
        },
        data: this.chartData
      }],
      subtitle: {
        text: 'Click a box to drill down (if pointing hand cursor); click grey box in upper right corner to drill up'
      },
      title: {
        text: `FTEs for ${this.chartData[0].name} ${this.chartData[0].type}`  // initial title for level 1 project/program
      }
    };

  }


  renderChart() {

    const that = this;

    $(function() {
      (function(H: any) {
        H.wrap(H.seriesTypes.treemap.prototype, 'drillUp', function(proceed) {
          console.log('DRILLUP FUNCTION TRIGGERED');
          // console.log('proceed');
          // console.log(proceed);
          // console.log('this:');
          // console.log(this);
          // console.log('H');
          // console.log(H);
          const rootNode = this.chart.series[0].rootNode;
          // console.log(rootNode);
          const level = rootNode ? rootNode.split('_').length : 0;
          console.log('level:');
          console.log(level);

          if (level === 1) {
            for (let i = 0; i < this.data.length; i++) {
              if (this.data[i].level === 2) {
                this.data[i].update({
                  color: '#7cb5ec'
                });
              }
            }
            console.log('this.data after color update:');
            console.log(this.data);
            that.testButtonVC.nativeElement.focus();
          }

          // update the title
          if (that.drillDownTitles.length >= 2) {
            this.chart.setTitle({text: that.drillDownTitles[that.drillDownTitles.length - 2]});
          } else if (that.drillDownTitles.length) {
            this.chart.setTitle({text: that.drillDownTitles[0]});
          }

          // remove the drilled down children from the table
          that.removeChildItemsFromTable();

          // remove the last chart title from the array
          that.removeTitlesFromHistory();

          // highlight the displayed items (next level up)
          that.highlightDisplayedItems(undefined, level);

          // this.chart = Highcharts.chart('rollupChart', that.chartOptions);

          // console.log('drill history:');
          // console.log(that.drillHistory);
          // console.log('data:');
          // console.log(this.data);
          // console.log('H:');
          // console.log(H);
          // H.each(this.data, function(el) {
          //   console.log(el);
          //   // if (el.options.level === 0) {
          //   //   el.update({
          //   //     color: '#7cb5ec'
          //   //   });
          //   // }
          // });
          // console.log('updated data:');
          // console.log(this.data);
          proceed.apply(this);

        });
      })(Highcharts);
    });



    // render the chart
    this.chart = Highcharts.chart('rollupChart', this.chartOptions);
    setTimeout(() => {
      this.chart.reflow();
    }, 0);


  }


  onTestClick() {
    console.log('test button clicked');
    console.log(this.chart.series[0].data[0].select(true, true));
  }

  reRenderChart() {
    // this.chartOptions.plotOptions.series.animation = false;
    this.chart.destroy();
    this.chart = Highcharts.chart('rollupChart', this.chartOptions);
    setTimeout(() => {
      this.chart.reflow();
    }, 0);
  }


  checkClickedItemIsInChart(id: number, tableData: any): boolean {
    let returnVal: boolean;
    tableData.forEach(data => {
      if (data.id.toString() === id.toString() && data.highlight) {
        returnVal = true;
      }
    });
    return returnVal ? returnVal : false;
  }


}
