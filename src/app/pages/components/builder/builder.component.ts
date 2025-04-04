import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { delay, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { BudgetData } from '../../../models/budget.model';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss'
})
export class BuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  @Input() title: string = '';

  @ViewChild('editableTable') editableTable!: ElementRef<HTMLTableElement>;
  currentCell: HTMLTableCellElement | null = null;

  header = 'Budget Builder';
  monthDefault = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months = signal<string[]>(this.monthDefault);
  currentYear = '2025';

  private defaultCategoryLabel = 'New Category';
  private defaultSubCategoryLabel = 'New Sub Category';

  budget = signal<BudgetData[]>([]);
  budgetTotal = signal<number[]>([]);

  constructor() {}

  ngOnInit(): void {
    this.initBudgetData();
    this.initMonthData();
  }

  ngAfterViewInit(): void {
    // Focus the first editable cell after the view is initialized
    (document.querySelector(".tbl-cell-value") as HTMLTableCellElement)?.focus();

    const table = this.editableTable.nativeElement;

    // Add keyboard navigation event listener
    table.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onKeyDown(e: KeyboardEvent): void {
    const table = this.editableTable.nativeElement;
    this.currentCell = e.target as HTMLTableCellElement;

    if (this.currentCell.tagName.toLowerCase() !== 'td') return;

    const row = this.currentCell.parentElement as HTMLTableRowElement;
    const colIndex = Array.from(row.children).indexOf(this.currentCell);
    const rowIndex = Array.from(table.rows).indexOf(row);

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
    if (this.currentCell) {
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
      ...this.generateDefaultBudgetSubData(
        this.generateDefaulListBudgetData()
      )
    );
  }

  private initBudgetData(): void {
    this.budget.set(
      this.generateDefaultBudgetData(
        this.generateDefaultBudgetSubData(
          this.generateDefaulListBudgetData()
        )
      )
    );

    // Set the initial value of budget to the generated default data
    this.calculateSum(0);
  }

  private generateDefaultBudgetData(newList?: BudgetData[], newOrder?: number): BudgetData[] {
    return [
      {
        order: newOrder || 0,
        category: this.defaultCategoryLabel + ` ${(newOrder || 0) + 1}`,
        list: newList || [],
        editable: true,
      },
    ];
  }

  private generateDefaultBudgetSubData(newList?: BudgetData[], newOrder?: number): BudgetData[] {
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
        editable: true
      });
    }

    return result;
  }

  private initMonthData(): void {
    this.months.set(
      this.months().map(month => `${month} ${this.currentYear}`)
    );
  }

  updateCellValue(
    categoryIndex: number,
    subCategoryIndex: number,
    cellIndex: number,
    event: FocusEvent
  ): void {
    const textContent = (event.target as HTMLTableCellElement).innerText.trim().replace(/\n/g, '');;
    
    if (textContent) {
      const value = isNaN(+textContent) ? 0 : +textContent;

      const updatedData = [...this.budget()];
      updatedData[categoryIndex].list![subCategoryIndex].list![cellIndex].value =
        value;
      this.budget.set(updatedData);

      (event.target as HTMLTableCellElement).innerText = '' + value;

      this.calculateSum(categoryIndex);
    }
  }

  updateCategoryCellValue(
    categoryIndex: number,
    event: FocusEvent
  ): void {
    const textContent = (event.target as HTMLTableCellElement).innerText.trim().replace(/\n/g, '');;
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
    const textContent = (event.target as HTMLTableCellElement).innerText.trim().replace(/\n/g, '');;
    if (textContent) {
      const updatedData = [...this.budget()];
      updatedData[categoryIndex].list![subCategoryIndex].category = textContent;
      this.budget.set(updatedData);

      (event.target as HTMLTableCellElement).innerText = textContent;
    }
  }

  handleEnterAddParent(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // Prevent the default action (e.g., form submission)

    this.handleAddParent();
  }

  handleAddParent(): void {
    const updatedData = [...this.budget()];
    if (updatedData) {

      const newRow = this.generateDefaultBudgetData(
        this.generateDefaultBudgetSubData(
          this.generateDefaulListBudgetData()
        ),
        updatedData.length
      );

      // Add the new row to the list
      updatedData.push(...newRow);
      this.budget.set(updatedData);
      this.calculateSum(updatedData.length - 1);
    }
  }

  // Handle Enter key to add new row
  handleEnterAddSub(event: KeyboardEvent, parentIndex: number): void {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // Prevent the default action (e.g., form submission)

    this.handleAddSub(parentIndex);
  }

  handleAddSub(parentIndex: number): void {
    const updatedData = [...this.budget()];
    if (updatedData[parentIndex]?.list) {

      const newRow = this.generateDefaultBudgetSubData(
        this.generateDefaulListBudgetData(),
        updatedData[parentIndex].list!.length
      );

      // Add the new row to the list
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

  handleRemoveParent(categoryIndex: number): void {
    const updatedData = [...this.budget()];
    if (updatedData) {
      updatedData.splice(categoryIndex, 1);
      this.budget.set(updatedData);
      this.calculateSum(categoryIndex);
    }
  }

  setCursorAtEnd(inputElement: any): void {
    of(null).pipe(
      switchMap(res => of(res).pipe(delay(0))),
      tap(() => {
        const cell = inputElement.target as HTMLElement;
        const range = document.createRange();
        const selection = window.getSelection();

        if (selection) {
          range.selectNodeContents(cell);
          range.collapse(false);  // Move the cursor to the end
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  // Calculate the sum of each index across all subcategories
  calculateSum(categoryIndex: number): void {
    const data = [...this.budget()];
    if (!data) return;

    // Initialize an array with zeros for each column (12 months)
    const sumArray = Array(this.months().length).fill(0);

    // Iterate through each subcategory
    const category = data[categoryIndex];
    if (!category) {
      this.calculateFinalTotal();
      return;
    }

    const list = category.list;
    if (list) {
      for (const subCategory of list) {
        // Ensure the subCategory has a list
        if (!subCategory.list) continue;

        // Iterate through each index of the subcategory
        for (let i = 0; i < subCategory.list.length; i++) {
          // Accumulate the value at each index
          sumArray[i] += subCategory.list[i].value;
        }
      }

      category.total = sumArray;
    }

    this.calculateFinalTotal();
  }

  calculateFinalTotal(): void {
    const data = [...this.budget()];
    if (!data) return;

    // Initialize an array with zeros for each column (12 months)
    const totalData = Array(this.months().length).fill(0);

    for (const category of data) {
      for (let j = 0; j < this.months().length; j++) {
        // Sum the values for each month
        totalData[j] += category.total![j];
      }
    }

    this.budgetTotal.set(totalData);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
