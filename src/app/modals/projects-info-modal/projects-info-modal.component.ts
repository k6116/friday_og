import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-projects-info-modal',
  templateUrl: './projects-info-modal.component.html',
  styleUrls: ['./projects-info-modal.component.css']
})
export class ProjectsInfoModalComponent implements OnInit {

  @Input() project: any;
  @Output() close = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit() {
  }

  onCloseClick() {
    console.log('close button clicked');
    this.close.emit(true);
  }

}
