import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../_shared/models/user.model';
import { Subscription } from 'rxjs/Subscription';
import * as Highcharts from 'highcharts';


declare var require: any;
declare const $: any;
const moment = require('moment');
require('highcharts/highcharts-more.js')(Highcharts);

@Component({
  selector: 'app-top-projects-bubble',
  templateUrl: './top-projects-bubble.component.html',
  styleUrls: ['./top-projects-bubble.component.css', '../../_shared/styles/common.css']
})
export class TopProjectsBubbleComponent implements OnInit, OnDestroy {

  loggedInUser: User; // object for logged in user's info
  fteDataSubscription: Subscription;
  rosterDataSubscription: Subscription;
  bubbleChart: any;
  rawBubbleData: any;
  anchorBubbleData = [];
  flexBubbleData = [];
  otherBubbleData = [];
  bubbleChartOptions: any;
  projectRoster: any;
  displayRosterTable = false;

  constructor(
    private apiDataService: ApiDataService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // get logged in user's info
    this.authService.getLoggedInUser((user, err) => {
      if (err) {
        // console.log(`error getting logged in user: ${err}`);
        return;
      }
      this.loggedInUser = user;
      this.getBubbleFteData();
    });
  }

  ngOnDestroy() {
    if (this.fteDataSubscription) {
      this.fteDataSubscription.unsubscribe();
    }
    if (this.rosterDataSubscription) {
      this.rosterDataSubscription.unsubscribe();
    }
    if (this.bubbleChart) {
      this.bubbleChart.destroy();
    }
  }

  getBubbleFteData() {
    this.fteDataSubscription = this.apiDataService.getAggregatedFteData().subscribe( res => {
      this.rawBubbleData = res;

      this.rawBubbleData.forEach( project => {
        // compute project complexity score (mock right now)
        let score = 1;
        if (project.fiveYearRev) {
          score += Math.round(Math.log10(project.fiveYearRev));
        }
        if (project.PriorityName === 'Anchor') {
          score += 3;
        } else if (project.PriorityName === 'Flex') {
          score += 1;
        }
        const tempProj = {
          x: score,
          y: project.employeeCount,
          z: project.fteTotals,
          projectID: project.projectID,
          projectName: project.projectName
        };

        if (project.PriorityName === 'Anchor') {
          this.anchorBubbleData.push(tempProj);
        } else if (project.PriorityName === 'Flex') {
          this.flexBubbleData.push(tempProj);
        } else {
          this.otherBubbleData.push(tempProj);
        }

      });

      this.plotBubbleFteData();
    });
  }

  plotBubbleFteData() {
    this.bubbleChartOptions = {
      credits: {
        text: 'jarvis.is.keysight.com',
        href: 'https://jarvis.is.keysight.com'
      },
      chart: {
        type: 'bubble',
        plotBorderWidth: 1,
        zoomType: 'xy'
      },
      legend: {
        enabled: true
      },
      title: {
        text: 'Top Keysight projects by FTE, vs Employee Count and Complexity'
      },
      subtitle: {
        text: 'Time Period: All historic data'
      },
      xAxis: {
        gridLineWidth: 1,
        title: {text: 'Complexity Score (mock)'},
        labels: {format: '{value}'},
      },
      yAxis: {
        startOnTick: false,
        endOnTick: false,
        title: {text: 'Number of Employees'},
        labels: {format: '{value}'},
        maxPadding: 0.2,
      },
      tooltip: {
        useHTML: true,
        headerFormat: '<table>',
        pointFormat: '<tr><th colspan="2"><h3>{point.projectName}</h3></th></tr>' +
          '<tr><th>Complexity:</th><td>{point.x}</td></tr>' +
          '<tr><th># of Employees:</th><td>{point.y}</td></tr>' +
          '<tr><th># FTEs Allocated:</th><td>{point.z}</td></tr>',
        footerFormat: '</table>',
        followPointer: true
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '{point.projectName}'
          },
          point: {
            events: {
              click: function(e) {
                const p = e.point;
                this.displayRosterTable = false;
                this.showProjectRoster(p.projectID);
              }.bind(this)
            }
          }
        }
      },
      series: [{
        name: 'Anchor',
        data: this.anchorBubbleData,
        color: '#cc1111'
      }, {
        name: 'Flex',
        data: this.flexBubbleData,
        color: '#2222bb'
      }, {
        name: 'Other',
        data: this.otherBubbleData,
        color: '#8a8a8a'
      }]
    };
    this.bubbleChart = Highcharts.chart('bubble', this.bubbleChartOptions);
  }

  showProjectRoster(projectID: number) {
    this.rosterDataSubscription = this.apiDataService.getProjectRoster(projectID).subscribe( res => {
      this.projectRoster = res[0].teamMembers;
      console.log(this.projectRoster);
      this.displayRosterTable = true;
    });
  }
}