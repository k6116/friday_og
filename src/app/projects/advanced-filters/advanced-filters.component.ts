import { Component, OnInit, OnDestroy, ViewChild, ElementRef, EventEmitter, Output } from '@angular/core';
import { ToolsService } from '../../_shared/services/tools.service';
import { ApiDataAdvancedFilterService, ApiDataOrgService } from '../../_shared/services/api-data/_index';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { CacheService } from '../../_shared/services/cache.service';
import { ExcelExportService } from '../../_shared/services/excel-export.service';

// import { start } from 'repl';
const moment = require('moment');
declare const require: any;

declare var $: any;
declare const Bloodhound;

export interface NewPLC {
  index: number;
  PLCStatusID: string;
  PLCStatusName: string;
  PLCDateFrom: string;
  PLCDateTo: string
}

@Component({
  selector: 'app-advanced-filters',
  templateUrl: './advanced-filters.component.html',
  styleUrls: ['./advanced-filters.component.css', '../../_shared/styles/common.css']
})

export class AdvancedFiltersComponent implements OnInit, OnDestroy {

  @ViewChild('filterStringVC') filterStringVC: ElementRef;
  @ViewChild('filterStringOw') filterStringOw: ElementRef;

  @Output() selectedBom = new EventEmitter<any>();

  filterObject: any;      // main Object containing strings that's being send to the db
  advancedFilterData: any; // All projects on init using forkjoin
  projectTypes: any;
  projectStatuses: any;
  projectPriorities: any;
  plcStatuses: any;

  filterString: string;     // string for top search bar
  filterStringOwner: string; // string for owner search bar
  filterCheckedArray: any; // array to clear out owners

  // Arrays for filterObject
  arrTypeID: any;
  arrOwnerEmail: any;
  arrStatusID: any;
  arrPriorityID: any;
  objPLC: any; // object containing all PLC info (newPLC) that's needed for filterObject
  plcSchedules: any; // contains PLC status name headers
  allManagers:any;
  managers: any;
  managerTeam: any;

  // PLC information for filterObjects
  newPLC: NewPLC = {
    index: null,
    PLCStatusID: '',
    PLCStatusName: '',
    PLCDateFrom: '',
    PLCDateTo: ''
  };

  // For default Check All
  checkAllProjectTypes: boolean; 
  checkAllProjectPriorities: boolean;
  checkAllProjectStatuses: boolean;

  // Filter Results
  advancedFilteredResults: any;
  advancedFilteredResultsFlat: any; // for excel download
  
  // etc
  ngUnsubscribe = new Subject();
  subscription2: Subscription; // for excel download
  showSpinner: boolean;
  showPage: boolean;
  showResults: boolean;
  showDownloadingIcon: boolean;
  htmlElement: any;
  minDate: string;
  fteMin: any; // for fte checkbox logic
  fteMax: any; // for fte checkbox logic
  
  // month
  currentMonth: number;
  firstMonthOfQtr: number;
  currentYear: number;

  constructor(
    private apiDataAdvancedFilterService: ApiDataAdvancedFilterService,
    private apiDataOrgService: ApiDataOrgService,
    private cacheService: CacheService,
    private excelExportService: ExcelExportService,
    private toolsService: ToolsService
  ) {

    // declare filter option object; NULLs ar REQUIRED
    this.filterObject = {
      PLCStatusIDs: '',       // num1,num2,num3,..
      PLCDateRanges: '',      // From1|To1, From2|To2, From3|To3,... 
      ProjectName: '',        // name, name, name,..
      ProjectTypeIDs: '',     // num,num,num,..
      ProjectStatusIDs: '',   // num,num,num,..
      ProjectPriorityIDs: '', // num,num,num,..
      ProjectOwnerEmails: '', // email1, email2, email3,...
      FTEMin: 'NULL',         // 0
      FTEMax: 'NULL',         // 100
      FTEDateFrom: 'NULL',    // 2017-01-01
      FTEDateTo: 'NULL'       // 2017-01-01
    };

    this.filterCheckedArray = [];
    this.arrTypeID = [];
    this.arrStatusID = [0];   // adding 0 as blank
    this.arrPriorityID = [0];
    this.arrOwnerEmail = [];
    this.objPLC = [];
    this.plcSchedules = []; // save clicked plc statuses
    this.fteMin = [];
    this.fteMax = [];
    this.minDate = '1900-01-01';

    // For Excel Download
    this.subscription2 = this.cacheService.showDownloadingIcon.subscribe(show => {
      this.showDownloadingIcon = show;
    });


  }

  async ngOnInit() {

    // hide the footer until the page is ready to be rendered
    this.toolsService.hideFooter();

    // show the spinner
    this.showSpinner = true;

    // get all filters for the page using forkjoin
    this.advancedFilterData = await this.getAdvancedFilterData()
    .catch(err => {
      console.log(err);
    });

    // seperate out for html
    this.projectTypes = this.advancedFilterData[1];
    this.projectStatuses = this.advancedFilterData[2];
    this.projectPriorities = this.advancedFilterData[3];
    this.plcStatuses = this.advancedFilterData[4];

    // initalize Checkboxes
    this.initCheckboxArrays()

    // get all managers for typeahead
    this.allManagers = this.getManagersTypeAhead('ron_nersesian@keysight.com');

    // hide the spinner
    this.showSpinner = false;

    // show page
    this.showPage = true;

    // hide layover
    this.showResults = true

    // show the footer
    this.toolsService.showFooter();


    console.log('Advanced filter data:', this.advancedFilterData);

    this.setCurrentMonthYear();
  }

  ngOnDestroy() {

    // this.ngUnsubscribe.next();
    // this.ngUnsubscribe.complete();

    // for excel download
    this.subscription2.unsubscribe();

  }

  initCheckboxArrays() {

    this.checkAllProjectTypes = true;
    this.checkAllProjectPriorities = true;
    this.checkAllProjectStatuses = true;

    for (let i = 0; i < this.projectStatuses.length; i++) {
      this.arrStatusID.push(this.projectStatuses[i].id);
    }

    for (let i = 0; i < this.projectTypes.length; i++) {
      this.arrTypeID.push(this.projectTypes[i].id);
    }
    
    for (let i = 0; i < this.projectPriorities.length; i++) {
      this.arrPriorityID.push(this.projectPriorities[i].id);
    }

    // Leave the NULLs !
    this.filterObject = {
      PLCStatusIDs: '',       // num,num,num,..
      PLCDateRanges: '',      // From|To
      ProjectName: '',        // num,num,num,..
      ProjectTypeIDs: String(this.arrTypeID),
      ProjectStatusIDs: String(this.arrStatusID),
      ProjectPriorityIDs: String(this.arrPriorityID),
      ProjectOwnerEmails: '',
      FTEMin: 'NULL',
      FTEMax: 'NULL',
      FTEDateFrom: 'NULL',        // 2017-01-01
      FTEDateTo: 'NULL'           // 2017-01-01
    };

    // send to db
    this.advancedFilter(this.filterObject);

  }

  async getAdvancedFilterData(): Promise<any> {
    return await this.apiDataAdvancedFilterService.getAdvancedFilterData().toPromise();
  }

  // Applied filter results
  async advancedFilter(filterOptions: any) {

        // show page
        // this.showPage = false;
        // show the spinner
        this.showSpinner = true;
        this.showResults = false;

    this.advancedFilteredResults = await this.apiDataAdvancedFilterService.getAdvancedFilteredResults(filterOptions).toPromise();
    
    this.advancedFilteredResults.nested.forEach( project => {
      const schedules = [];
      if ('Schedules' in project) {

        Object.keys(project.Schedules).forEach(function(key) {
          schedules.push({
            PLCStatusName: key,
            PLCDate: project.Schedules[key]
          });
        });
        project.Schedules = schedules;
      }
    });
    this.advancedFilteredResultsFlat = this.advancedFilteredResults.flat; // for excel download
    this.advancedFilteredResults = this.advancedFilteredResults.nested;
    console.log('this.advancedFilteredResults', this.advancedFilteredResults);

    // For PLC status headers:
    if (this.advancedFilteredResults.length !== 0) {
      // save only checked statuses to be displayed in results table header
      this.plcSchedules = this.advancedFilteredResults[0].Schedules;
    } else {
      this.plcSchedules = [];
    }

            // show page
            // this.showPage = true;
            // show the spinner
            this.showSpinner = false;
            this.showResults = true;
    
  }

  async getProjectChildren(projectName: string, projectType: string, projectOwner: string) {
    const children = await this.apiDataAdvancedFilterService.getProjectChildren(projectName, projectType, projectOwner).toPromise();
    console.log('children', children);
  }

  async getProjectParents(projectName: string, projectType: string, projectOwner: string) {
    const parents = await this.apiDataAdvancedFilterService.getProjectParents(projectName, projectType, projectOwner).toPromise();
    console.log('parents', parents);
  }

// PROJECT OWNERS

  async getManagersTypeAhead(managerEmailAddress: string) {
    this.managers = await this.apiDataOrgService.getManagementOrgStructure(managerEmailAddress).toPromise();
    this.getTypeahead(this.managers);
  }

  async getProjectOwnerSubordinates(managerEmailAddress: string) {
    this.managerTeam = await this.apiDataOrgService.getManagementOrgStructure(managerEmailAddress).toPromise();
  }

  getTypeahead(managers: any) {

    // initialize bloodhound suggestion engine with data
    const bh = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('fullName'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: managers  // flat array of managers from api data service
    });

    // initialize typeahead using jquery
    $('.typeahead').typeahead({
      hint: true,
      highlight: true,
      minLength: 1,
    },
    {
      name: 'first-names',
      displayKey: 'fullName',  // use this to select the field name in the query you want to display
      source: bh
    })
    .bind('typeahead:selected', (event, selection) => {
      // once something in the typeahead is selected, trigger this function
      this.onSelect(selection);
    });

    $('div.tt-menu').css('border-color', '#e9ecef');

  }

  // Selecting a name from the typeahead list
  async onSelect(selection) {

    const email = selection.EMAIL_ADDRESS

    // Save email string to filterObject
    this.filterObject.ProjectOwnerEmails = String(email);

    // Add to checkbox array
    this.arrOwnerEmail.splice(0, 0, email);

    // Make the db call
    this.advancedFilter(this.filterObject);

    // Show div with subordinates
    this.managerTeam = this.getProjectOwnerSubordinates(email);
    
  }

  onClearOwnerClick() {

    // reset string, manager array and scheckbox array
    this.filterStringOwner = undefined;
    this.managerTeam = [];
    this.arrOwnerEmail = [];

    // reset db object
    this.filterObject.ProjectOwnerEmails = '';

    // Make the db call
    this.advancedFilter(this.filterObject);

    // this.filterStringOwner.nativeElement.focus();

  }


// CHECKBOXES

  // reset checkbox array to initial state
  onCheckboxReset(chekboxID: any) {

    switch (chekboxID) {
      case 'ProjectTypeIDs':
        for (let i = 0; i < this.projectTypes.length; i++) {
          this.arrTypeID.push(this.projectTypes[i].id);
        }        
        break;
      case 'ProjectStatusIDs':
        this.arrStatusID = [0]; // adding zero as blank
        for (let i = 0; i < this.projectStatuses.length; i++) {
          this.arrStatusID.push(this.projectStatuses[i].id);
        }
        break;
      case 'ProjectPriorityIDs':
        this.arrPriorityID = [0];  // adding zero as blank
        for (let i = 0; i < this.projectPriorities.length; i++) {
          this.arrPriorityID.push(this.projectPriorities[i].id);
        } 
        break;
      case 'PLCStatusIDs':
        for (let i = 0; i < this.plcStatuses.length; i++) {
          this.newPLC = {
            index: i,
            PLCStatusID: this.plcStatuses[i].PLCStatusID,
            PLCStatusName: this.plcStatuses[i].PLCStatusName,
            PLCDateFrom: 'NULL',
            PLCDateTo: 'NULL'
          }
          this.objPLC.push(this.newPLC);
        }
        break;
    }

  }

  // Checkbox "All"
  async onCheckAllClick(event: any) {
    const checkboxID = event.target.id;
    const checkState = event.target.checked;
    const objKey = Object.keys(this.filterObject);
    
    if (checkState === false) {
      // loop through array of object keys and compare with the checkbox IDs
      for (let i = 0; i < objKey.length; i++) {

        if (objKey[i] === checkboxID) {

          switch (objKey[i]) {
            case 'ProjectTypeIDs':
              this.arrTypeID = [];
              this.filterObject.ProjectTypeIDs = String(this.arrTypeID);
              break;
            case 'ProjectOwnerEmails':
              this.arrOwnerEmail = this.managerTeam[0].EMAIL_ADDRESS;
              this.filterObject.ProjectOwnerEmails = String(this.arrOwnerEmail);
              break;
            case 'ProjectStatusIDs':
              this.arrStatusID = [];
              this.filterObject.ProjectStatusIDs = String(this.arrStatusID);
              break;
            case 'ProjectPriorityIDs':
              this.arrPriorityID = [];
              this.filterObject.ProjectPriorityIDs = String(this.arrPriorityID);
              break;
            case 'FTEMin':
              this.filterObject.FTEMin = 'NULL';
              this.filterObject.FTEMax = 'NULL';
              break;
            case 'PLCStatusIDs':
              this.objPLC = [];
              this.filterObject.PLCStatusIDs = String(this.objPLC);
              break
          }
          break;

        }

      }
    } 

    else if (checkState === true) {

      // fill filterObjects with array from init or any other default values
      for (let i = 0; i < objKey.length; i++) {

        if(objKey[i] === checkboxID) {
          switch (objKey[i]) {
            case 'ProjectTypeIDs':
              await this.onCheckboxReset(checkboxID);
              this.filterObject.ProjectTypeIDs = String(this.arrTypeID);
              break;
            case 'ProjectOwnerEmails':
              for (let i = 0; i < this.managerTeam.length; i++) {
              this.arrOwnerEmail.push(this.managerTeam[i].EMAIL_ADDRESS);
              }
              this.filterObject.ProjectOwnerEmails = String(this.arrOwnerEmail);
              break;
            case 'ProjectStatusIDs':
              await this.onCheckboxReset(checkboxID);
              this.filterObject.ProjectStatusIDs = String(this.arrStatusID);
              break;
            case 'ProjectPriorityIDs':
              await this.onCheckboxReset(checkboxID);
              this.filterObject.ProjectPriorityIDs = String(this.arrPriorityID);
              break;
            case 'FTEMin':
              this.filterObject.FTEMin = '0';
              this.filterObject.FTEMax = '100';
              break;
            case 'PLCStatusIDs':
              // objPLC contains newPLC array because it also needs to save dates
              // selecting all means newPLC has to be created for each PLC status 
              await this.onCheckboxReset(checkboxID);
              let arr = [];
              for (let i = 0; i < this.objPLC.length; i++) {
                arr.push(this.objPLC[i].PLCStatusID)
              }
              this.filterObject.PLCStatusIDs = String(arr);
              break;
          }
          break;
        }
      }

    }
    console.log('filterObject:', this.filterObject);

    // Make the db call
    this.advancedFilter(this.filterObject);

  }

  // ProjectTypes
  onCheckboxProjectTypeClick(event: any, id: string) {
    const checked = event.target.checked;

    if (checked === true) {
      // ADD ID to array
      this.arrTypeID.splice(0, 0, id);
    } 

    else if (checked === false) {
      // find ID in array
      for (let i = 0; i < this.arrTypeID.length; i++) {
        // REMOVE from array
        if (this.arrTypeID[i] === id) {
          this.arrTypeID.splice(i, 1);
          break;
        }
      }
    }

    // Convert and save array to filterObject
    this.filterObject.ProjectTypeIDs = String(this.arrTypeID);

    // Make the db call
    this.advancedFilter(this.filterObject);
    
  }

  // Project Status
  onCheckboxProjectStatusClick(event: any, id: string) {
    const checked = event.target.checked;

    if (checked === true) {
      // ADD ID to array
      this.arrStatusID.splice(0, 0, id);
    } 
    
    else if (checked === false){
      // find ID in array
      for (let i = 0; i < this.arrStatusID.length; i++) {
        // REMOVE from array
        if (this.arrStatusID[i] === id) {
          this.arrStatusID.splice(i, 1);
          break;
        }
      }
    }

    // Convert and save array to filterObject
    this.filterObject.ProjectStatusIDs = String(this.arrStatusID);

    // Make the db call
    this.advancedFilter(this.filterObject);
    
  }

  // Project Priority
  onCheckboxProjectPriorityClick(event: any, id: string) {
    const checked = event.target.checked;

    if (checked === true) {
      // ADD ID to array
      this.arrPriorityID.splice(0, 0, id);
    } 
    
    else if (checked === false) {
      // find ID in array
      for (let i = 0; i < this.arrPriorityID.length; i++) {
        // REMOVE from array
        if (this.arrPriorityID[i] === id) {
          this.arrPriorityID.splice(i, 1);
          break;
        }
      }
    }

    // Convert and save array to filterObject
    this.filterObject.ProjectPriorityIDs = String(this.arrPriorityID);
    console.log(this.filterObject.ProjectPriorityIDs);

    // Make the db call
    this.advancedFilter(this.filterObject);
    
  }


// FTE

  onFTEToggleSelected(event: any) {

    const id = event.target.id;
    this.filterObject.FTEDateFrom = '09/01/2018';
    this.filterObject.FTEDateTo = 'NULL';

    switch (id) {
      case 'all':
        this.filterObject.FTEDateFrom = String(this.currentMonth);
        this.filterObject.FTEDateTo = 'NULL';
        break;

      case 'month':
        this.filterObject.FTEDateFrom = 'NULL';
        this.filterObject.FTEDateTo = 'NULL';
        break;
      
      case 'qtr':
        this.filterObject.FTEDateFrom = 'NULL';
        this.filterObject.FTEDateTo = 'NULL';
        break;
    
      case 'year':
        const yearRange0 = '01/01/' + this.currentYear;
        const yearRange1 = '12/31/' + this.currentYear;
        console.log('Year Range:', yearRange0, yearRange1);
        this.filterObject.FTEDateFrom = 'NULL';
        this.filterObject.FTEDateTo = 'NULL';
        break;

      default:
        break;
    }

    console.log('Toggle Clicked', event);
    console.log('filterObject', this.filterObject);

    // Make the db call
    this.advancedFilter(this.filterObject);
  }

  onInputFTETotalClick() {

    const minValue = '';
    const maxValue = '';

    this.filterObject.FTEMin = String(minValue);
    this.filterObject.FTEMax = String(maxValue);
  }

  onInputFTEMinChange(event: any) {
    const value = event.target.value;
    this.filterObject.FTEMin = String(value);

    // Make the db call
    this.advancedFilter(this.filterObject);
  }

  onInputFTEMaxChange(event: any) {
    const value = event.target.value;
    this.filterObject.FTEMax = String(value);

    // Make the db call
    this.advancedFilter(this.filterObject);
  }

  onInputFTEChange(event: any, index) {
    const date = event.target.value; // input date
    const id = event.target.id; // either fteFrom or fteTo
    const valid = event.target.validity.valid;
    console.log(valid)

     // Only allow dates from 2000 to current date
     if (valid === true ) {
       switch (id) {
         case 'fteFrom':
           this.filterObject.FTEDateFrom = String(date);
           break;
          case 'fteTo':
           this.filterObject.FTEDateTo = String(date);
           break;
       }

       this.filterObject.FTEMin = String(0);
       this.filterObject.FTEMax = String(100);
      console.log(this.filterObject);

      // Make the db call
      this.advancedFilter(this.filterObject);
     }   
  }

  setCurrentMonthYear() {
    // Initialize to current quarter's month/year
    // currentMonth is the "real" month
    // setMonth is the month the user is viewing
    const thisMonth = Number(moment().format('M')); // 1 === Jan, 2 === Feb
    if (thisMonth === 11 || thisMonth === 12 || thisMonth === 1) {
      this.currentMonth = moment(1, 'DD').month(10); // When setting the month number: 0 === Jan, 1 === Feb
    } else if (thisMonth === 2 || thisMonth === 3 || thisMonth === 4) {
      this.currentMonth = moment(1, 'DD').month(1);
    } else if (thisMonth === 5 || thisMonth === 6 || thisMonth === 7) {
      this.currentMonth = moment(1, 'DD').month(4);
    } else if (thisMonth === 8 || thisMonth === 9 || thisMonth === 10) {
      this.currentMonth = moment(1, 'DD').month(7);
    }

    // Current Month
    this.currentMonth = Number(moment().format('M'));
    console.log('Current Month:', this.currentMonth);

    // Current Qtr
    this.firstMonthOfQtr = Number(moment(this.currentMonth).format('MMMM'));
    console.log('Current Qtr:', this.firstMonthOfQtr);

    // Current Year
    this.currentYear = moment().year();
    console.log('Current Year:', this.currentYear);

    console.log('Test:', moment().toISOString());
    console.log('Test with month:', moment(this.currentMonth).toISOString())
  }


// PLC SCHEDULES

  onCheckboxPLCScheduleClick(index, event: any, plcStatus: any) {
    const checked = event.target.checked;

    // use interface to sort out all the attributes
    this.newPLC = {
      index: index,
      PLCStatusID: plcStatus.PLCStatusID,
      PLCStatusName: plcStatus.PLCStatusName,
      PLCDateFrom: 'NULL',
      PLCDateTo: 'NULL'
    }

    // add or remove to local array depending on the checkbox state
    if (checked === true) {

      // Add checked PLC Status
      this.objPLC.push(this.newPLC);

    } else {

      // find the right object to delete by comparing their index
      for (let i = 0; i < this.objPLC.length; i++) {
        if (this.objPLC[i].index === index) {

          // remove from array
          this.objPLC.splice(i, 1);

          break;
        }
      }

    }

    // Call function that takes care of the string manipulation for the db
    this.filterPLCSchedule();

  }

  onInputPLCChange(event: any, index) {
    const date = event.target.value; // input date
    const id = event.target.id; // either plcFrom or plcTo
    const valid = event.target.validity.valid;

    // Only allow dates from 1900 and complete dates
    if (valid === true ) {

      // loop through objPLC to save input value
      for (let i = 0; i < this.objPLC.length; i++) {

        if (this.objPLC[i].index === index && id === 'plcFrom') {

          if (date !== '') {
            this.objPLC[i].PLCDateFrom = date;
          } 
          else { // on clear input click
            this.objPLC[i].PLCDateFrom = 'NULL';
          }

        }
        
        if (this.objPLC[i].index === index && id === 'plcTo') {

          if (date !== '') {
            this.objPLC[i].PLCDateTo = date;
          }
          else { // on clear input click
            this.objPLC[i].PLCDateTo = 'NULL';
          }
          
        } 

      }
  
      // string manipulation
      this.filterPLCSchedule();

    }

  }

  // This is where the string manipulation happens
  async filterPLCSchedule() {
    const arrID = [];
    const arrFromDate = [];

    // organize the data in buckets in order to convert each array into strings
    for (let i = 0; i < this.objPLC.length; i++) {
      arrID.splice(0, 0, this.objPLC[i].PLCStatusID);
      arrFromDate.splice(0, 0, this.objPLC[i].PLCDateFrom + '|' + this.objPLC[i].PLCDateTo);
    }

    // save strings into the db object
    this.filterObject.PLCStatusIDs = String(arrID);
    this.filterObject.PLCDateRanges = String(arrFromDate);

    // Make db call
    await this.advancedFilter(this.filterObject);
  }

  onCheckboxProjectOwnerClick(event: any, email: string) {
    const value = event.target.checked;

    // Consolidate all filters in one array
    if (value === true) {
      // ADD ID to array
      this.arrOwnerEmail.splice(0, 0, email);
    } else {
      // find ID in array
      for (let i = 0; i < this.arrOwnerEmail.length; i++) {
        // REMOVE from array
        if (this.arrOwnerEmail[i] === email) {
          this.arrOwnerEmail.splice(i, 1);
          break;
        }
      }
    }
    console.log('Project Owners Array', this.arrOwnerEmail);

    // Convert the array to string
    this.filterObject.ProjectOwnerEmails = String(this.arrOwnerEmail);
    console.log('PROJECT OWNER STRING:', this.filterObject.ProjectOwnerEmails);

    // Make the db call
    this.advancedFilter(this.filterObject);

  }

// SEARCH BAR
  
  // on clicking the 'x' icon at the right of the search/filter input
  onClearSearchClick() {

    // clear the filter string
    this.filterString = undefined;

    // reset the focus on the filter input
    this.filterStringVC.nativeElement.focus();

  }

// EXPORT FUNCTION

  onExportButtonMouseEnter() {

    const options = {
      title: 'Download Excel File',
      placement: 'left'
    };

    $('button.export-button').tooltip(options);
    $('button.export-button').tooltip('show');

  }

  onExportButtonMouseLeave() {
    $('button.export-button').tooltip('dispose');
  }

  onExportClick() {

    // show the animated downloading icon
    this.showDownloadingIcon = true;

    // hide the tooltip
    $('button.export-button').tooltip('dispose');

    // set an array of objects representing the selected columns to export
    // NOTE: if this is null or undefined it will export all columns
    const colsToExport = [
          {
            name: 'ProjectName',
            alias: 'JarvisID'
          },
          {
            name: 'ProjectName',
          },
          {
            name: 'ProjectTypeName',
            alias: 'ProjectType'
          },
          {
            name: 'PriorityName',
            alias: 'Priority'
          },
          {
            name: 'ProjectStatusName',
            alias: 'Status'
          },
          {
            name: 'ProjectOwnerName',
            alias: 'ProjectOwner'
          },
          {
            name: 'TotalProjectFTE',
          },
          {
            name: 'Schedule',
          },
          {
            name: 'CreatedBy',
          },
          {
            name: 'CreationDate'
          },
          {
            name: 'LastUpdatedBy'
          },
          {
            name: 'LastUpdateDate'
          }
        ];
    
    // get the array of projects objects that are displayed
    // const projects = this.filterPipe.transform(this.projects, this.filterString, this.selectedFilter.columnName,
    //   {matchFuzzy: {on: this.selectedFilter.matchFuzzy, threshold: this.fuzzySearchThreshold},
    //   matchOptimistic: this.selectedFilter.matchOptimistic, matchExact: this.selectedFilter.matchExact});

    // export / download an Excel file with the projects data (server version)
    setTimeout(() => {
      this.excelExportService.exportServer('Jarvis Projects Export', 'Projects', this.advancedFilteredResultsFlat);
    }, 1000);
  }

  // TEST BUTTON
  onTestFormClick() {
    // const filterOptions = {
    //   PLCStatusIDs: '',
    //   PLCDateRanges: '',
    //   ProjectName: '',
    //   ProjectTypeIDs: '',
    //   ProjectStatusIDs: '',
    //   ProjectPriorityIDs: '',
    //   ProjectOwnerEmails: '',
    //   FTEMin: 'NULL',
    //   FTEMax: 'NULL',
    //   FTEDateFrom: 'NULL',
    //   FTEDateTo: 'NULL'
    // };
    const filterOptions = {
      PLCStatusIDs: '1,2,3,4,5,6',
      PLCDateRanges: 'NULL|NULL,2017-05-01|2019-09-01,2017-05-01|2019-09-01,NULL|NULL,NULL|NULL,2017-05-01|2019-09-01',
      ProjectName: '',
      ProjectTypeIDs: '1,2,3',
      ProjectStatusIDs: '',
      ProjectPriorityIDs: '1',
      ProjectOwnerEmails: '',
      FTEMin: '1.5',
      FTEMax: '5.5',
      FTEDateFrom: '2017-01-01',
      FTEDateTo: '2019-01-01'
    };
    this.advancedFilter(filterOptions);
    // this.getProjectOwnerSubordinates('henri_komrij@keysight.com');
    // this.getProjectChildren('Loki', 'Program', 'ethan_hunt@keysight.com');
    // this.getProjectParents('Arges70', 'NCI', 'ethan_hunt@keysight.com');

  }

}
