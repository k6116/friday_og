import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators, FormBuilder } from '@angular/forms';
import { trigger, state, style, transition, animate, keyframes, group } from '@angular/animations';
import { DecimalPipe } from '@angular/common';
import { NouisliderModule } from 'ng2-nouislider';

import { User } from '../../_shared/models/user.model';
import { AuthService } from '../../auth/auth.service';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { ToolsService } from '../../_shared/services/tools.service';
import { UserFTEs, AllocationsArray} from './fte-model';
import { utils, write, WorkBook } from 'xlsx';
import { saveAs } from 'file-saver';

const moment = require('moment');
require('moment-fquarter');

declare const require: any;
declare const $: any;

// Test

@Component({
  selector: 'app-fte-entry',
  templateUrl: './fte-entry.component.html',
  styleUrls: ['./fte-entry.component.css', '../../_shared/styles/common.css'],
  providers: [DecimalPipe]
  // animations: [
  //   trigger('conditionState', [
  //     state('in', style({
  //       opacity: 1,
  //       transform: 'translateY(0)'
  //     })),
  //     transition('in => void', [
  //       animate(100, style({
  //         opacity: 0,
  //         transform: 'translateY(25px)'
  //       }))
  //     ]),
  //     transition('void => in', [
  //       animate(100, style({
  //         opacity: 1
  //       }))
  //     ])
  //   ])
  // ]
})
export class FteEntryEmployeeComponent implements OnInit, AfterViewInit {

  // initialize variables
  mainSliderConfig: any;  // slider config
  fteMonthVisible = new Array(36).fill(false);  // boolean array for by-month FTE form display
  FTEFormGroup: FormGroup;
  sliderRange: number[] = [];
  userFTEs: any;  // array to store user FTE data
  userFTEsFlat: any;  // array to store user FTE data (flattened/non-treeized version)
  display: boolean; // TODO: find a better solution to FTE display timing issue
  loggedInUser: User; // object for logged in user's info
  projects: any;  // for aliasing formarray
  months: string[] = [];
  state: string; // for angular animation
  monthlyTotals: number[];
  monthlyTotalsValid: boolean[];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiDataService: ApiDataService,
    private toolsService: ToolsService,
    private decimalPipe: DecimalPipe
  ) {
    // initialize the FTE formgroup
    this.FTEFormGroup = this.fb.group({
      FTEFormArray: this.fb.array([])
    });

    this.state = 'in';

    this.monthlyTotals = new Array(36).fill(null);
    this.monthlyTotalsValid = new Array(36).fill(true);

  }

  ngOnInit() {

    this.setSliderConfig(); // initalize slider config

    // get logged in user's info
    this.authService.getLoggedInUser((user, err) => {
      if (err) {
        console.log(`error getting logged in user: ${err}`);
        return;
      }
      console.log('logged in user data received in main component:');
      console.log(user);
      this.loggedInUser = user;
      this.fteComponentInit();  // initialize the FTE entry component
    });

    this.buildMonthsArray();

  }

  ngAfterViewInit() {



  }


  onTableScroll(event) {
    const scrollTop = $('div.table-scrollable').scrollTop();
    const scrollLeft = $('div.table-scrollable').scrollLeft();
    // console.log(`scroll left: ${scrollLeft}, scroll top: ${scrollTop}`);

    $('div.table-header-underlay').css('top', `${scrollTop}px`);
    $('table.table-ftes thead tr th').css('top', `${scrollTop - 10}px`);
    $('table.table-ftes tbody tr td.col-project-name').css('left', `${scrollLeft - 15}px`);
    $('table.table-ftes tbody tr td.col-total-name').css('left', `${scrollLeft - 15}px`);
    $('table.table-ftes thead tr th.header-project').css('left', `${scrollLeft - 15}px`);
    $('div.table-header-underlay').css('left', `${scrollLeft}px`);

  }


  onFTEChange(i, j, value) {
    console.log(`fte entry changed for project ${i}, month ${j}, with value ${value}`);

    let fteReplace: boolean;
    let fteReplaceValue: any;

    // check for match on the standard three digit format 0.5, 1.0
    const match = /^[0][.][1-9]{1}$/.test(value) || /^[1][.][0]{1}$/.test(value);
    // if not a match, will want to update/patch it to use the standard format
    if (!match) {
      fteReplace = true;
      // check for still valid format such as .6, 1., 1
      if (/^[.][1-9]{1}$/.test(value) || /^[1][.]$/.test(value) || /^[1]$/.test(value)) {
        fteReplaceValue = this.decimalPipe.transform(value, '1.1');
      } else {
        fteReplaceValue = null;
      }
    }
    // console.log(`match is ${match}, replacement value: ${fteReplaceValue}`);

    const FTEFormArray = <FormArray>this.FTEFormGroup.controls.FTEFormArray;
    const FTEFormProjectArray = <FormArray>FTEFormArray.at(i);
    const FTEFormGroup = FTEFormProjectArray.at(j);
    FTEFormGroup.patchValue({
      updated: true
    });

    if (fteReplace) {
      FTEFormGroup.patchValue({
        fte: fteReplaceValue
      });
    }

    // update the monthly total
    this.updateMonthlyTotal(j);

    // set the border color for the monthly totals inputs
    this.setMonthlyTotalsBorder();

  }


  updateMonthlyTotal(index) {

    // initialize a temporary variable, set to zero
    let total = 0;

    // set the outer form array of projeccts and months
    const fteTable = this.FTEFormGroup.value.FTEFormArray;

    // loop through each project
    fteTable.forEach((project, i) => {
      // loop through each month
      project.forEach((month, j) => {
        // if the month matches the month that was updated, update the total
        if (j === index) {
          total += +month.fte;
        }
      });
    });

    // set to null if zero (to show blank) and round to one significant digit
    total = total === 0 ? null : Math.round(total * 10) / 10;

    // set the monthly totals property at the index
    this.monthlyTotals[index] = total;

  }


  updateMonthlyTotals() {

    // initialize a temporary array with zeros to hold the totals
    let totals = new Array(36).fill(0);

    // set the outer form array of projeccts and months
    const fteTable = this.FTEFormGroup.value.FTEFormArray;

    // loop through each project
    fteTable.forEach((project, i) => {
      // loop through each month
      project.forEach((month, j) => {
        totals[j] += +month.fte;
      });
    });

    // replace the zeros with nulls to show blanks
    totals = totals.map(total => {
      return total === 0 ? null : total;
    });

    // round the totals to one significant digit
    totals = totals.map(total => {
      return total ? Math.round(total * 10) / 10 : null;
    });

    // set the monthly totals property
    this.monthlyTotals = totals;

  }

  // set red border around totals that don't total to 1
  setMonthlyTotalsBorder() {

    this.monthlyTotals.forEach((total, index) => {

      // get a reference to the input element using jquery
      const $totalEl = $(`input.fte-totals-column[month-index="${index}"]`);

      if (!total) {
        // console.log(`month ${index} total is null(${total})`);
        this.monthlyTotalsValid[index] = true;
      } else if (total !== 1) {
        // console.log(`month ${index} does NOT total to 1.0 (${total})`);
        this.monthlyTotalsValid[index] = false;
      } else {
        // console.log(`month ${index} DOES total to 1.0 (${total})`);
        this.monthlyTotalsValid[index] = true;
      }

    });


  }


  onTestFormClick() {
    console.log('form object (this.form):');
    console.log(this.FTEFormGroup);
    console.log('form data (this.form.value.FTEFormArray):');
    console.log(this.FTEFormGroup.value.FTEFormArray);
  }


  onTestSaveClick() {

    const fteData = this.FTEFormGroup.value.FTEFormArray;
    const t0 = performance.now();
    // call the api data service to send the put request
    this.apiDataService.updateFteData(fteData, this.loggedInUser.id)
      .subscribe(
        res => {
          console.log(res);
          const t1 = performance.now();
          console.log(`save fte values took ${t1 - t0} milliseconds`);
        },
        err => {
          console.log(err);
        }
      );

  }


  fteComponentInit() {
    // get FTE data
    this.apiDataService.getFteData(this.loggedInUser.id)
    .subscribe(
      res => {
        console.log(res);
        this.userFTEs = res.nested;
        this.userFTEsFlat = res.flat;
        console.log('user ftes (this.userFTEs):');
        console.log(this.userFTEs);
        console.log('user ftes flat (this.userFTEsFlat):');
        console.log(this.userFTEsFlat);
        this.buildFteEntryForm(); // initialize the FTE Entry form, which is dependent on FTE data being retrieved
        this.display = true;  // ghetto way to force rendering after FTE data is fetched
        this.projects = this.userFTEs;
      },
      err => {
        console.log(err);
      }
    );
  }

  buildMonthsArray() {
    const startDate = moment().utc().startOf('year').subtract(2, 'months').subtract(1, 'years');
    const endDate = moment(startDate).add(3, 'years');
    // console.log(`start date:`);
    // console.log(startDate);
    // console.log(`end date:`);
    // console.log(endDate);
    const numMonths = endDate.diff(startDate, 'months');
    // console.log(`number of months: ${numMonths}`);
    for (let i = 0; i < numMonths; i++) {
      this.months.push(moment(startDate).add(i, 'months'));
    }
    console.log('months array:');
    console.log(this.months);
    // console.log('first month as string');
    // console.log(moment(this.months[0]).format('YYYY-MM-DDTHH.mm.ss.SSS') + 'Z');
  }

  buildFteEntryForm = (): void => {
    // grab the Project formarray
    const FTEFormArray = <FormArray>this.FTEFormGroup.controls.FTEFormArray;

    // remove any existing form groups in the array
    this.toolsService.clearFormArray(FTEFormArray);


    console.log('unix epoch for first month:');
    console.log(moment(this.months[0]).unix());

    // check if no data was returned
    if (this.userFTEs.length) {
      // loop through each project to get into the FTE entry elements
      this.userFTEs.forEach( (proj: UserFTEs) => {
        const projFormArray = this.fb.array([]); // instantiating a temp formarray for each project

        // proj.allocations.forEach( (mo: AllocationsArray) => {
        this.months.forEach(month => {
          // for each FTE entry in a given project, push the FTE controller into the temp formarray
          // so we will have 1 controller per month, one array of controllers per project
          // console.log('unix epoch in seconds:');
          // console.log(moment(mo.month).unix());

          // attempt to find a record/object for this project and month
          const foundEntry = this.userFTEsFlat.find(userFTE => {
            return proj.projectID === userFTE.projectID && moment(month).unix() === moment(userFTE['allocations:month']).unix();
          });
          // console.log(`found object for project ${proj.projectName} and month ${month}:`);
          // console.log(foundEntry);

          projFormArray.push(
            this.fb.group({
              recordID: [foundEntry ? foundEntry['allocations:recordID'] : null],
              projectID: [proj.projectID],
              // month: [moment(month).format('YYYY-MM-DDTHH.mm.ss.SSS') + 'Z'],
              month: [month],
              fte: [foundEntry ? this.decimalPipe.transform(foundEntry['allocations:fte'], '1.1') : null],
              newRecord: [foundEntry ? false : true],
              updated: [false]
            })
          );
        });
        console.log(projFormArray);
        // push the temp formarray as 1 object in the Project formarray
        FTEFormArray.push(projFormArray);
      });
      // this.projects = FTEFormArray.controls;  // alias the FormArray controls for easy reading

      // update the totals row
      this.updateMonthlyTotals();

      // set red border around total inputs that don't sum up to 1
      this.setMonthlyTotalsBorder();
    }
  }

  addNewProject() {
    const newProject = new UserFTEs;
    newProject.userID = this.loggedInUser.id;
    newProject.projectID = 16;
    newProject.projectName = 'Bacon';
    newProject.allocations = new Array<AllocationsArray>();
    this.months.forEach( month => {
      const newMonth = new AllocationsArray;
      newMonth.month = moment(month).utc().format();
      newMonth.fte = null;
      newMonth.recordID = null;
      newProject.allocations.push(newMonth);
    });
    console.log('new project');
    console.log(newProject);

    this.userFTEs.push(newProject);
    console.log(this.userFTEs);
    this.buildFteEntryForm();
    console.log('projects array');
    console.log(this.projects);
  }

  setSliderConfig() {

    // set slider starting range based on current date
    let startDate = moment().startOf('month');
    let month = moment(startDate).month();
    if (month === 10 || month === 11 || month === 0) {
      this.sliderRange = [4, 6]; // Q1
    } else if (month === 1 || month === 2 || month === 3) {
      this.sliderRange = [5, 7]; // Q2
    } else if (month === 4 || month === 5 || month === 6) {
      this.sliderRange = [6, 8];
    } else {
      this.sliderRange = [7, 9];
    }

    // initialize the by-month FTE display with the slider range handles
    this.fteMonthVisible = this.fteMonthVisible.fill(true, this.sliderRange[0] * 3, this.sliderRange[1] * 3);

    // generate slider labels based on current date
    startDate = moment().startOf('year').subtract(2, 'months'); // first day of this FY
    startDate = moment(startDate).subtract(1, 'year');  // first day of last FY
    month = moment(startDate).month();
    let firstQuarter = moment(startDate).fquarter(-3).quarter;
    let firstYear = moment(startDate).fquarter(-3).year;
    const fyLabelArray = new Array<string>(12).fill('');

    // make an array of label strings, ie - [Q4'17, Q1'18]
    fyLabelArray.forEach(function(element, i) {
      fyLabelArray[i] = `Q${firstQuarter}'${firstYear.toString().slice(2)}`;
      firstQuarter++;
      if (firstQuarter > 4) {
        firstYear++;
        firstQuarter = 1;
      }
    });

    // make array of values for slider pips
    const pipValues = [];
    for (let i = 0; i <= 12; i = i + 0.5) {
      pipValues.push(i);
    }

    // set slider config
    this.mainSliderConfig = {
      behaviour: 'tap-drag',
      connect: true,
      range: {
          min: 0,
          max: 12
      },
      margin: 1,  // set minimum distance between the 2 handles
      pips: {
          // set the pips (markers) every 0.5 steps. This is a hacky way to get labels in between the steps, as you'll see below
          mode: 'values',
          values: pipValues,
          density: 24,

          // custom filter to set pips only visible at the major steps
          filter: function filterHalfSteps( value, type ) {
            // a '2' returns the full-size label and marker CSS class
            // a '1' returns the sub-size label and marker css class.  We will override the sub-css to make the marker invisible
            return value % 1 ? 2 : 1;
          },
          format: {
            // format labels usch that full-size pips have no label, but sub-size pips have the FY/Quarter label
            to: function ( value ) {
                if (value % 1 === 0) {
                return '';
                } else {
                return fyLabelArray[value - 0.5];
                }
            }
          }
      },
      // set css overrides.  must include all CSS class names, even if they aren't being overridden
      cssPrefix: 'noUi-',
      cssClasses: {
          target: 'target',
          base: 'base',
          origin: 'origin',
          handle: 'handle-mod', // modified
          // handleLower: 'handle-lower',
          // handleUpper: 'handle-upper',
          horizontal: 'horizontal',
          vertical: 'vertical',
          background: 'background',
          connect: 'connect',
          connects: 'connects',
          ltr: 'ltr',
          rtl: 'rtl',
          draggable: 'draggable',
          drag: 'state-drag',
          tap: 'state-tap',
          active: 'active',
          tooltip: 'tooltip',
          pips: 'pips',
          pipsHorizontal: 'pips-horizontal',
          pipsVertical: 'pips-vertical',
          marker: 'marker',
          markerHorizontal: 'marker-horizontal',
          markerVertical: 'marker-vertical',
          markerNormal: 'marker-normal',
          markerLarge: 'marker-large',
          markerSub: 'marker-sub-mod', // modified
          value: 'value',
          valueHorizontal: 'value-horizontal',
          valueVertical: 'value-vertical',
          valueNormal: 'value-normal',
          valueLarge: 'value-large',
          valueSub: 'value-sub-mod' // modified
      }
    };
  }

  onSliderChange(value: any) {
    // round the slider values and set the handles to emulate snapping
    const leftHandle = Math.round(value[0]);
    const rightHandle = Math.round(value[1]);
    this.sliderRange = [leftHandle, rightHandle];

  }

  onSliderUpdate(value: any) {
    // get rounded handle values, but don't set
    const leftHandle = Math.round(value[0]);
    const rightHandle = Math.round(value[1]);

    // translate handle positions to month-quarters
    const posStart = leftHandle * 3;
    const posDelta = ((rightHandle - leftHandle) * 3);

    // set only months that should be visible to true
    this.fteMonthVisible = this.fteMonthVisible.fill(false);
    this.fteMonthVisible = this.fteMonthVisible.fill(true, posStart, posStart + posDelta);

    // TEMP CODE: workaround for rendering issue for column headers (months)
    // let scrollTop = $('div.table-scrollable').scrollTop();
    // $('div.table-scrollable').scrollTop(scrollTop - 1);
    // scrollTop = $('div.table-scrollable').scrollTop();
    // $('div.table-scrollable').scrollTop(scrollTop + 1);

  }

  exportXLSX() {
    const ws_name = 'Sheet1';
    const wb: WorkBook = { SheetNames: [], Sheets: {} };
    const ws: any = utils.json_to_sheet(this.userFTEs);
    wb.SheetNames.push(ws_name);
    wb.Sheets[ws_name] = ws;
    const wbout = write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });

    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i !== s.length; ++i) {
        view[i] = s.charCodeAt(i) & 0xFF;
      }
      return buf;
    }

    saveAs(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), 'userFTE.xlsx');

  }
}
