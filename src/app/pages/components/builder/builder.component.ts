import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  BehaviorSubject,
  delay,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { BudgetData } from '../../../models/budget.model';
import { ScrollEventService } from '../../../services/scroll-event.service';
import { ApplyAllOptions, MonthPattern } from '../../../shared/constant';
import { BalanceService } from '../../../services/balance.service';
import { FormsModule } from '@angular/forms';
import { DateService } from '../../../services/date.service';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
})
export class BuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @ViewChild('editableTable') editableTable!: ElementRef<HTMLTableElement>;
  @ViewChild('scrollableTable') scrollableTable!: ElementRef<HTMLDivElement>;
  @ViewChildren('tblCellValue') elements!: QueryList<ElementRef>;

  @Input() title: string = '';
  @Input() type: 'income' | 'expense' = 'income';
  @Input() showMonths: boolean = true;
  @Input() triggerEntireBudget$!: Observable<number>;

  currentCell: HTMLTableCellElement | null = null;

  months = signal<string[]>([...MonthPattern]);
  currentYear = new Date().getFullYear().toString();

  private defaultCategoryLabel = 'New Category';
  private defaultSubCategoryLabel = 'New Sub Category';

  budget = signal<BudgetData[]>([]);
  budgetTotal = signal<number[]>([]);

  private _showContextMenu$ = new BehaviorSubject<boolean>(false);
  readonly showContextMenu$ = this._showContextMenu$.asObservable();

  get showContextMenu(): boolean {
    return this._showContextMenu$.getValue();
  }

  set showContextMenu(value: boolean) {
    this._showContextMenu$.next(value);
  }

  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  currentRow = 0;
  currentCol = 0;
  currentCellIndex = 0;
  currentType = 'income';

  applyAllOptions = [...ApplyAllOptions];

  constructor(
    private scrollEvent: ScrollEventService,
    private balance: BalanceService,
    private date: DateService
  ) {}

  ngOnInit(): void {
    this.initBudgetData();
    this.initMonthData();
    this.handleShowContextMenuData();
    this.handleDisplayYear();
    this.handleDisplayNumberOfMonths();
    this.handleTriggerApplyAllBudget();
  }

  ngAfterViewInit(): void {
    // focus on the first cell
    if (
      this.elements.toArray()[0].nativeElement.id ===
      this.getCellId('income', 0, 0, 0)
    ) {
      this.elements.toArray()[0].nativeElement.focus();
    }

    const table = this.editableTable.nativeElement;
    table.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.syncScrollToLeft();
  }

  private handleDisplayYear(): void {
    this.date.selectedYear$
      .pipe(
        tap((year) => {
          this.currentYear = year.toString();
          this.months.set(
            [...MonthPattern].map((month) => `${month} ${this.currentYear}`)
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private handleDisplayNumberOfMonths(): void {
    this.date.numberOfMonths$
      .pipe(
        tap((numberOfMonths) => {
          // updated months
          this.months.set(
            [...MonthPattern]
              .slice(0, numberOfMonths)
              .map((month) => `${month} ${this.currentYear}`)
          );

          // updated budget total
          const updatedBudgetTotal = [...this.budgetTotal()];
          this.updateBudgetTotalList(updatedBudgetTotal, numberOfMonths);
          this.budgetTotal.set(updatedBudgetTotal);

          // updated budget
          const updatedBudgetData = [...this.budget()];
          for (const budget of updatedBudgetData) {
            if (budget.total) {
              this.updateBudgetTotalList(budget.total, numberOfMonths);
            }

            if (!budget.list) continue;
            for (let i = 0; i < budget.list.length; i++) {
              const subCategory = budget.list[i];

              if (!subCategory.list) continue;
              subCategory.list = this.updateBudgetList(
                subCategory.list,
                numberOfMonths
              );
            }
          }

          this.calculateSum(0);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private updateBudgetList(initArray: BudgetData[], num: number): BudgetData[] {
    const length = initArray.length;

    if (num <= length) {
      return initArray.slice(0, num);
    } else {
      const newArray = [...initArray];
      for (let i = length + 1; i < num; i++) {
        newArray.push({
          order: i,
          value: 0,
          editable: true,
        } as BudgetData);
      }

      newArray.push({
        order: +num,
        value: 0,
        editable: true,
      } as BudgetData); // added selected number
      return newArray;
    }
  }

  private updateBudgetTotalList(initArray: number[], num: number): number[] {
    const length = initArray.length;

    if (num <= length) {
      return initArray.slice(0, num);
    } else {
      const newArray = [...initArray];
      for (let i = length + 1; i < num; i++) {
        newArray.push(0);
      }

      newArray.push(+num); // added selected number
      return newArray;
    }
  }

  private getCellId(
    type?: string,
    categoryIndex?: number,
    subCategoryIndex?: number,
    cellIndex?: number
  ): string {
    // get cell id
    return `${type || this.type}-p${categoryIndex || 0}-s${
      subCategoryIndex || 0
    }-i${cellIndex || 0}`;
  }

  syncScroll(e: Event): void {
    const target = e.target as HTMLElement;
    this.scrollEvent.scrollPosition$.next(target.scrollLeft);
  }

  private syncScrollToLeft(): void {
    this.scrollEvent.scrollPosition$
      .pipe(
        tap(
          (scrollLeft) =>
            (this.scrollableTable.nativeElement.scrollLeft = scrollLeft)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private handleShowContextMenuData(): void {
    this.showContextMenu$
      .pipe(
        switchMap((res) => of(res).pipe(delay(100))),
        tap((res) => (this.contextMenuVisible = res)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onRightClick(
    event: MouseEvent,
    type: string,
    row: number,
    col: number,
    cellIndex: number
  ): void {
    event.preventDefault();
    this.currentType = type;
    this.currentRow = row;
    this.currentCol = col;
    this.currentCellIndex = cellIndex;
    this.showContextMenu = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
  }

  applyAllWithOption(option: string): void {
    // close context menu
    this.showContextMenu = false;

    switch (option) {
      case 'onSubCategory':
        this.applyAllSubCategory();
        break;
      case 'onCategory':
        this.applyCategory();
        break;
      case 'onCategories':
        this.applyCategories();
        break;
      case 'allBudget':
        const category = [...this.budget()];
        const subCategory = category[this.currentRow].list![this.currentCol].list;
        const currentCellValue = subCategory![this.currentCellIndex].value;

        // set the value to all cells in the column
        this.balance.actionApplyAllBudget$.next(currentCellValue || 0);
        break;
      default:
        break;
    }
  }

  private applyAllSubCategory(): void {
    // get the cell value
    const category = [...this.budget()];
    const subCategory = category[this.currentRow].list![this.currentCol].list;
    const currentCellValue = subCategory![this.currentCellIndex].value;

    // set the value to all cells in the column
    for (let i = 0; i < this.months().length; i++) {
      category[this.currentRow].list![this.currentCol].list![i].value =
        currentCellValue;

      const el = this.elements
        .toArray()
        .find(
          (el) =>
            el.nativeElement.id ===
            this.getCellId(
              this.currentType,
              this.currentRow,
              this.currentCol,
              i
            )
        );

      if (el && currentCellValue !== undefined) {
        el.nativeElement.innerText = currentCellValue.toString();
      }
    }

    // update the budget data
    this.budget.set(category);
    this.calculateSum(this.currentRow);
  }

  private applyCategory(): void {
    // get the cell value
    const category = [...this.budget()];
    const subCategory = category[this.currentRow].list![this.currentCol].list;
    const currentCellValue = subCategory![this.currentCellIndex].value;

    // set the value to all cells in the column
    const categoryIndex = this.currentRow;
    (category[this.currentRow].list || []).flatMap((cell, subIndex) =>
      (cell.list || []).map((item, itemIndex) => ({
        item,
        categoryIndex,
        subIndex,
        itemIndex
      }))
    ).forEach(({item, categoryIndex, subIndex, itemIndex}) => {
      item.value = currentCellValue;

      const el = this.elements.toArray().find(
        (el) =>
          el.nativeElement.id ===
          this.getCellId(this.currentType, categoryIndex, subIndex, itemIndex)
      );
  
      if (el && currentCellValue !== undefined) {
        el.nativeElement.innerText = currentCellValue.toString();
      }

    });

    // update the budget data
    this.budget.set(category);
    this.calculateSum(categoryIndex);
  }

  private applyCategories(cellValue?: number): void {
    // get the cell value
    const category = [...this.budget()];
    const subCategory = category[this.currentRow].list![this.currentCol].list;
    const currentCellValue = cellValue !== undefined ? cellValue : subCategory![this.currentCellIndex].value;

    // set the value to all cells in the column
    category.flatMap((sub, categoryIndex) =>
      (sub.list || []).flatMap((cell, subIndex) =>
        (cell.list || []).map((item, itemIndex) => ({
          item,
          categoryIndex,
          subIndex,
          itemIndex
        }))
      )
    ).forEach(({item, categoryIndex, subIndex, itemIndex}) => {
      item.value = currentCellValue;

      const el = this.elements.toArray().find(
        (el) =>
          el.nativeElement.id ===
          this.getCellId(this.currentType, categoryIndex, subIndex, itemIndex)
      );

      if (el && currentCellValue !== undefined) {
        el.nativeElement.innerText = currentCellValue.toString();
      }

      // update the budget data
      this.budget.set(category);
      this.calculateSum(categoryIndex);
    });
  }

  private handleTriggerApplyAllBudget(): void {
    this.triggerEntireBudget$.pipe(
      tap((currentCellValue) => this.applyCategories(currentCellValue)),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const table = this.editableTable.nativeElement;
    this.currentCell = e.target as HTMLTableCellElement;

    // return if the current not found
    if (this.currentCell.tagName.toLowerCase() !== 'td') return;

    const row = this.currentCell.parentElement as HTMLTableRowElement;
    const colIndex = Array.from(row.children).indexOf(this.currentCell);
    const rowIndex = Array.from(table.rows).indexOf(row);

    // set the current cell
    switch (e.key) {
      case 'ArrowRight':
        this.navigateCell(rowIndex, colIndex + 1);
        break;
      case 'ArrowLeft':
        this.navigateCell(rowIndex, colIndex - 1);
        break;
      case 'ArrowDown':
        this.navigateCell(rowIndex + 1, colIndex);
        break;
      case 'ArrowUp':
        this.navigateCell(rowIndex - 1, colIndex);
        break;
      case 'Enter':
        if (e.shiftKey) {
          this.insertLineBreak();
          e.preventDefault();
        } else {
          e.preventDefault();
          this.addNewRow(rowIndex);
          this.navigateCell(rowIndex + 1, colIndex);
        }
        break;
    }
  }

  insertLineBreak(): void {
    if (!this.currentCell) return

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);
      range.setStartAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  navigateCell(rowIndex: number, colIndex: number): void {
    const table = this.editableTable.nativeElement;
    const rows = table.rows;

    if (rowIndex >= 1 && rowIndex < rows.length) {
      const cells = rows[rowIndex].cells;
      if (colIndex >= 0 && colIndex < cells.length) {
        cells[colIndex].focus();
      }
    }
  }

  addNewRow(rowIndex: number): void {
    const updatedData = [...this.budget()];
    updatedData.splice(
      rowIndex + 1,
      0,
      ...this.generateDefaultBudgetSubData(this.generateDefaulListBudgetData())
    );
  }

  private initBudgetData(): void {
    this.budget.set(
      this.generateDefaultBudgetData(
        this.generateDefaultBudgetSubData(this.generateDefaulListBudgetData())
      )
    );

    // set the budget total to 0
    this.calculateSum(0);
  }

  private generateDefaultBudgetData(
    newList?: BudgetData[],
    newOrder?: number
  ): BudgetData[] {
    return [
      {
        order: newOrder || 0,
        category: this.defaultCategoryLabel + ` ${(newOrder || 0) + 1}`,
        list: newList || [],
        editable: true,
      },
    ];
  }

  private generateDefaultBudgetSubData(
    newList?: BudgetData[],
    newOrder?: number
  ): BudgetData[] {
    return [
      {
        order: newOrder || 0,
        category: this.defaultSubCategoryLabel + ` ${(newOrder || 0) + 1}`,
        list: newList || [],
        editable: true,
      },
    ];
  }

  private generateDefaulListBudgetData(): BudgetData[] {
    const result = [] as BudgetData[];

    // new data from January to December
    for (let i = 0; i < this.months().length; i++) {
      result.push({
        order: i,
        value: 0,
        editable: true,
      });
    }

    return result;
  }

  private initMonthData(): void {
    this.months.set(
      this.months().map((month) => `${month} ${this.currentYear}`)
    );
  }

  updateCellValue(
    categoryIndex: number,
    subCategoryIndex: number,
    cellIndex: number,
    event: FocusEvent
  ): void {
    // close context menu
    this.showContextMenu = false;

    // get the cell value
    const textContent = (event.target as HTMLTableCellElement).innerText
      .trim()
      .replace(/\n/g, '');

    if (textContent) {
      const value = isNaN(+textContent) ? 0 : +textContent;
      const updatedData = [...this.budget()];

      // update the cell value
      updatedData[categoryIndex].list![subCategoryIndex].list![
        cellIndex
      ].value = value;
      this.budget.set(updatedData);

      (event.target as HTMLTableCellElement).innerText = '' + value;

      // update the cell value in the list
      this.calculateSum(categoryIndex);
    }
  }

  updateCategoryCellValue(categoryIndex: number, event: FocusEvent): void {
    const textContent = (event.target as HTMLTableCellElement).innerText
      .trim()
      .replace(/\n/g, '');

    if (textContent) {
      const updatedData = [...this.budget()];
      updatedData[categoryIndex].category = textContent;
      this.budget.set(updatedData);

      (event.target as HTMLTableCellElement).innerText = textContent;
    }
  }

  updateSubCategoryCellValue(
    categoryIndex: number,
    subCategoryIndex: number,
    event: FocusEvent
  ): void {
    const textContent = (event.target as HTMLTableCellElement).innerText
      .trim()
      .replace(/\n/g, '');

    if (textContent) {
      const updatedData = [...this.budget()];
      updatedData[categoryIndex].list![subCategoryIndex].category = textContent;
      this.budget.set(updatedData);

      (event.target as HTMLTableCellElement).innerText = textContent;
    }
  }

  handleEnterAddParent(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.handleAddParent();
  }

  handleAddParent(): void {
    const updatedData = [...this.budget()];
    if (updatedData) {
      const newRow = this.generateDefaultBudgetData(
        this.generateDefaultBudgetSubData(this.generateDefaulListBudgetData()),
        updatedData.length
      );

      // added the new row to the list
      updatedData.push(...newRow);
      this.budget.set(updatedData);
      this.calculateSum(updatedData.length - 1);
    }
  }

  handleEnterAddSub(event: KeyboardEvent, parentIndex: number): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.handleAddSub(parentIndex);
  }

  handleAddSub(parentIndex: number): void {
    const updatedData = [...this.budget()];

    if (updatedData[parentIndex]?.list) {
      const newRow = this.generateDefaultBudgetSubData(
        this.generateDefaulListBudgetData(),
        updatedData[parentIndex].list!.length
      );

      // added the new row to the list
      updatedData[parentIndex].list!.push(...newRow);
      this.budget.set(updatedData);
      this.calculateSum(parentIndex);
    }
  }

  handleRemoveSub(categoryIndex: number, subCategoryIndex: number): void {
    const updatedData = [...this.budget()];
    const parent = updatedData[categoryIndex];

    if (parent.list) {
      parent.list.splice(subCategoryIndex, 1);
      this.calculateSum(categoryIndex);
    }
  }

  handleEnterRemoveSub(
    $event: KeyboardEvent,
    categoryIndex: number,
    subCategoryIndex: number
  ): void {
    if ($event.key !== 'Enter') return;
    $event.preventDefault();
    this.handleRemoveSub(categoryIndex, subCategoryIndex);
  }

  handleRemoveParent(categoryIndex: number): void {
    const updatedData = [...this.budget()];

    if (updatedData) {
      updatedData.splice(categoryIndex, 1);
      this.budget.set(updatedData);
      this.calculateSum(categoryIndex);
    }
  }

  handleEnterRemoveParent($event: KeyboardEvent, categoryIndex: number): void {
    if ($event.key !== 'Enter') return;
    $event.preventDefault();
    this.handleRemoveParent(categoryIndex);
  }

  calculateSum(categoryIndex: number): void {
    const data = [...this.budget()];
    if (!data) return;

    // init an array with 0 for each column (12 months)
    const sumArray = Array(this.months().length).fill(0);

    const category = data[categoryIndex];
    if (!category) {
      this.calculateFinalTotal();
      return;
    }

    const list = category.list;
    if (list) {
      // loop through each subcategory
      for (const subCategory of list) {
        if (!subCategory.list) continue;

        for (let i = 0; i < subCategory.list.length; i++) {
          sumArray[i] += subCategory.list[i].value;
        }
      }

      category.total = sumArray;
    }

    // update final total
    this.calculateFinalTotal();
  }

  calculateFinalTotal(): void {
    const data = [...this.budget()];
    if (!data) return;

    const totalData: number[] = Array(this.months().length).fill(0);

    // loop through each category
    for (const category of data) {
      for (let j = 0; j < this.months().length; j++) {
        totalData[j] += category.total![j];
      }
    }

    // update the budget total
    this.budgetTotal.set(totalData);
    this.updateBalance();
  }

  private updateBalance(): void {
    const balanceItemData = {
      order: 0,
      type: this.type,
      total: this.budgetTotal(),
    } as BudgetData;
    const balance = [...this.balance.balance$.getValue()];
    const balanceItem = balance.find(
      (balanceItem) => balanceItem.type === this.type
    );

    if (!balanceItem) {
      balance.push(balanceItemData);
    } else {
      balanceItem.total = this.budgetTotal();
    }

    this.balance.balance$.next(balance);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
