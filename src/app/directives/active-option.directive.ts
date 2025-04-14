import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[bdIsActiveOption]',
  standalone: true
})
export class ActiveOptionDirective {

  @HostBinding('class.is-active')
  private _isActive = true;

  @HostBinding('class.is-disable')
  private _isDisable = true;

  @Input()
  set isActiveOption(value: boolean) {
    this._isActive = value;
    this._isDisable = !value;
  }

  constructor() { }

}
