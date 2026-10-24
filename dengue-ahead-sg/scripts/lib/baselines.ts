export interface MonthlyRecord { month: string }   // e.g. { month: '2015-03', mean_rh: '83.2' }
export interface MonthStats { mean: number; sd: number; n: number }

/** Mean and SD per calendar month ('01'..'12') over years [fromYear, toYear], both inclusive. */
export function computeMonthlyBaselines(
  records: Array<MonthlyRecord & Record<string, string>>,
  field: string,
  fromYear: number,
  toYear: number,
): Record<string, MonthStats> {
  const valuesByMonth: Record<string, number[]> = {};

  for (const r of records) {
    const [yyyy, mm] = r.month.split('-');
    const year = Number(yyyy);

    if (year < fromYear || year > toYear) continue;
    const value = Number(r[field]);  
    if (Number.isNaN(value)) {
      throw new Error(`Non-numeric '${field}' value in ${r.month}: ${r[field]}`);
    }
    (valuesByMonth[mm] ??= []).push(value);

  }

  const result: Record<string, MonthStats> = {};
  for (const [mm, values] of Object.entries(valuesByMonth)) {
    const n = values.length;
    const mean = values.reduce((a, b) => a+b, 0) / n;
    let sd: number;
    if(n <= 1){
        sd = 0;
    }else{
        sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1));
    }
    
    result[mm] = { mean, sd, n };
  }
  return result;
}
