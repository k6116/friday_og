import { Injectable } from '@angular/core';
import { FilterPipe } from '../../../_shared/pipes/filter.pipe';
import { AdvancedFiltersDataService } from '../services/advanced-filters-data.service';

declare var $: any;
declare const Bloodhound;


@Injectable()
export class AdvancedFiltersTypeaheadService {

  projectsList: any;

  constructor(
    private filterPipe: FilterPipe,
    private advancedFiltersDataService: AdvancedFiltersDataService
  ) { }

    // TO-DO CHAI: Convert from bloodhound to fuse to be consistent
  getManagerTypeahead(that: any, managers: any): any {

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
      this.onSelect(that, selection);
    });

    $('div.tt-menu').css('border-color', '#e9ecef');

  }

  onSelect(that: any, selection) {

    // Note: "that" still refers to the main advanced-filters-component

    const email = selection.EMAIL_ADDRESS;

    // Save email string to filterObject
    that.filterObject.ProjectOwnerEmails = String(email);

    // Add to checkbox array
    that.arrOwnerEmail.splice(0, 0, email);

    // Make the db call
    this.advancedFiltersDataService.advancedFilter(that, that.filterObject);

    // Show div with subordinates
    that.getProjectOwnerSubordinates(email);

  }

  // initialize the typeahead functionality:  jQuery.typeahead(options, [*datasets])
  initProjectTypeahead(that: any, projectsList: any): any {

    // set 'this' in order to access the methods within this service within the typeahead source or bind functions
    // (this will lose/change its scope to the function)
    const that2 = this;

    // set the projects list locally so the typeahead can filter the list using the pipe
    this.projectsList = projectsList;

    // note: 'that' is referring to the project fte rollup component
    // note: 'that2' is referring to this service: project fte rollup typeahead

    // initialize the typeahead input with the options and dataset
    return $('.projects-filter-input').typeahead({
      hint: false,
      highlight: true,
      minLength: 1
    },
    {
      name: 'projects',
      displayKey: 'ProjectNameAndType',
      limit: 50,
      source: function(query, process) {
        // NOTE: query will be whatever text is typed into the input element
        // if the filterString is undefined, null, or an empty string, then override the query to avoid ?
        if (!that.filterString) {
          query = undefined;
        }
        // get an array of filtered project objects using the filter pipe with fuzzy search
        const filteredProjects = that2.getFilteredProjects(query);
        // process the array of objects to set the typeahead values
        process(filteredProjects);
      }
    })
    .bind('typeahead:selected', (event, selection) => {
      // set the focus on a hidden element behind the typeahead to force the typeahead input to lose focus
      that.hiddenInput.nativeElement.focus();

      // grab projectID and save in filterObject for db call
      const id = selection.ProjectID;
      that.filterObject.ProjectID = String(id);

      // save selected projectID for parent-child checkboxes
      that.selectedProjectID = id;

      // Make db call
      this.advancedFiltersDataService.advancedFilter(that, that.filterObject);
      // console.log(selection);

      // that.advancedFiltersDataService.getProjectChildren(that, id);
      this.onProjectSelect(that, id);
    });

  }

  // return an array of filtered project objects using the filter pipe with fuzzy search
  getFilteredProjects(query): any {
console.log(query);
    return this.filterPipe.transform(this.projectsList, query, 'ProjectName',
      {matchFuzzy: {on: true, threshold: 0.4}, returnAll: false});

  }

  async onProjectSelect(that: any, projectID: string) {

    // When selecting a project, get their parent-child relationship

    that.children = await this.advancedFiltersDataService.getProjectChildren(projectID);
    that.parents = await this.advancedFiltersDataService.getProjectParents(projectID);

    // Show them as checkboxes
    $('#childProjects').toggleClass('show');
    $('#parentProjects').toggleClass('show');

  }

}
