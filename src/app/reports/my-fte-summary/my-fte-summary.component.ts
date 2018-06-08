import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../_shared/models/user.model';
import { Subscription } from 'rxjs/Subscription';

import * as Highcharts from 'highcharts';

declare var require: any;
declare const $: any;
const moment = require('moment');


// need to look into this.  requiring specific highcharts modules in this fashion can
// cause cross-component conflicts with 'issvg of undefined' error
// require('highcharts/modules/annotations')(Highcharts);

@Component({
  selector: 'app-my-fte-summary',
  templateUrl: './my-fte-summary.component.html',
  styleUrls: ['./my-fte-summary.component.css', '../../_shared/styles/common.css']
})
export class MyFteSummaryComponent implements OnInit, OnDestroy {

  loggedInUser: User; // object for logged in user's info
  summarySubscription: Subscription;
  chartIsLoading = true;
  fteSummaryData: any;

  pieChart: any;
  pieChartOptions: any;

  timeSeriesChart: any;
  timeSeriesOptions: any;

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
      this.getFteSummaryData('current-quarter');  // initialize the FTE entry component
    });
  }

  ngOnDestroy() {
    if (this.summarySubscription) {
      this.summarySubscription.unsubscribe();
    }
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    if (this.timeSeriesChart) {
      this.timeSeriesChart.destroy();
    }
  }

  getFteSummaryData(period: string) {
    this.chartIsLoading = true;
    // Retrieve Top FTE Project List
    this.summarySubscription = this.apiDataService.getMyFteSummary(this.loggedInUser.id, period)
    .subscribe(
      res => {
        this.fteSummaryData = res;  // get summary data from db

        // total up the individual monthly FTEs into a project total
        let periodTotal = 0;
        this.fteSummaryData.forEach( project => {
          project.entries.forEach( entry => {
            project.fteTotal += entry.fte;
            periodTotal += entry.fte;
          });
        });

        this.fteSummaryData.forEach( project => {
          // convert project totals into percentages for pie chart
          project.y = project.fteTotal / periodTotal;
          // parse FTE data from nested json object into timestamp:fte array pairs for Highcharts
          const singleProjectData = [];
          project.entries.forEach( entry => {
            singleProjectData.push([moment(entry.date).valueOf(), entry.fte]);
          });
          project.data = singleProjectData;
        });
        this.plotTimeSeries(period);
        this.plotFteSummaryPie(period);
      },
      err => {
        console.log(err);
      }
    );
  }

  plotTimeSeries(period: string) {
    const timePeriod = this.timePeriods.find( obj => {
      return obj.period === period;
    });

    this.timeSeriesOptions = {
      chart: {
        type: 'spline',
        height: 370
      },
      title: {
        text: `${this.loggedInUser.fullName}'s Historic FTEs by project`
      },
      subtitle: {
        text: `Time Period: ${timePeriod.text}`
      },
      xAxis: {
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: 'Monthly FTEs Recorded'
        }
      },
      tooltip: {
        crosshairs: true,
        shared: true
      },
      series: this.fteSummaryData
    };
    this.timeSeriesChart = Highcharts.chart('timeSeries', this.timeSeriesOptions);
    this.chartIsLoading = false;
  }

  plotFteSummaryPie(period: string) {
    const timePeriod = this.timePeriods.find( obj => {
      return obj.period === period;
    });

    this.pieChartOptions = {
      credits: {
        text: 'jarvis.is.keysight.com',
        href: 'https://jarvis.is.keysight.com'
      },
      chart: {
        type: 'pie',
        height: 300
      },
      title: {
        text: `${this.loggedInUser.fullName}'s Project Allocation Percentages`
      },
      subtitle: {
        text: `Time Period: ${timePeriod.text}`
      },
      tooltip: {
        pointFormat:
          `FTEs in Period: <b>{point.fteTotal}</b><br />
          {series.name}: <b>{point.percentage:.1f}%</b>`
      },
      plotOptions: {
        pie: {
          dataLabels: {
            distance: -40
          }
        }
      },
      series: [{
        name: 'Percent of Period',
        colorByPoint: true,
        data: this.fteSummaryData
      }]
    };

    this.pieChart = Highcharts.chart('pie', this.pieChartOptions);
  }

}
