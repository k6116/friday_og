import { Component, OnInit } from '@angular/core';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../_shared/models/user.model';

import * as Highcharts from 'highcharts';

declare var require: any;
declare const $: any;
const moment = require('moment');
require('highcharts/modules/pareto.js')(Highcharts);

@Component({
  selector: 'app-team-fte-summary',
  templateUrl: './team-fte-summary.component.html',
  styleUrls: ['./team-fte-summary.component.css', '../../_shared/styles/common.css']
})
export class TeamFteSummaryComponent implements OnInit {

  loggedInUser: User; // object for logged in user's info
  paretoChartOptions: any;
  userPlmData: any;
  teamSummaryData: any;
  timePeriods = [
    {period: 'current-quarter', text: 'Current Quarter'},
    {period: 'current-fy', text: 'Current Fiscal Year'},
    {period: 'all-time', text: 'All Time'}
  ];


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
      this.getTeamSummaryData('current-quarter');
    });
  }

  getTeamSummaryData(period: string) {
    this.apiDataService.getUserPLMData(this.loggedInUser.email).subscribe( res => {
      this.userPlmData = res[0];
      this.apiDataService.getAggregatedSubordinateFTE(this.userPlmData.SUPERVISOR_EMAIL_ADDRESS).subscribe( res2 => {
        this.teamSummaryData = res2;
        this.plotFteSummaryPareto(period);
      });
    });
  }

  plotFteSummaryPareto(period: string) {
    const timePeriod = this.timePeriods.find( obj => {
      return obj.period === period;
    });

    const names = [];
    const values = [];
    this.teamSummaryData.forEach( project => {
      names.push(project.name);
      values.push(project.fteTotals);
    });

    this.paretoChartOptions = {
      credits: {
        text: 'jarvis.is.keysight.com',
        href: 'https://jarvis.is.keysight.com'
      },
      chart: {
        renderTo: 'pareto',
        type: 'column'
      },
      title: {
        text: `My Team's FTE Pareto`
      },
      subtitle: {
        text: `${timePeriod.text}`
      },
      xAxis: {
        categories: names
      },
      yAxis: [{
        title: {text: 'FTEs'}
      },
      {
        title: {text: ''},
        minPadding: 0,
        maxPadding: 0,
        max: 100,
        min: 0,
        opposite: true,
        labels: {format: '{value}%'}
      }],
      series: [{
        type: 'pareto',
        name: 'Pareto',
        yAxis: 1,
        zIndex: 10,
        baseSeries: 1
      },
      {
        name: 'FTEs Recorded',
        type: 'column',
        colorByPoint: true,
        zIndex: 2,
        data: values
      }]
    };
    Highcharts.chart('pareto', this.paretoChartOptions);
  }
}
