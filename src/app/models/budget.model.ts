export interface BudgetData {
  order: number;
  category?: string;
  value?: number;
  list?: BudgetData[];
  total?: number[];
  type?: 'income' | 'expense';
  editable?: boolean;
}