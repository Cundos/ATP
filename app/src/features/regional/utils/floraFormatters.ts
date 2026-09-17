export const MONTH_SHORT_NAMES: Record<number, string> = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
};

export const MONTH_FULL_NAMES: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

interface MonthInterval {
  start: number;
  end: number;
}

/**
 * Formatea un arreglo de meses (1..12) en rangos contiguos y legibles.
 * Soporta secuencias contiguas, intervalos discontinuos (unidos por ' · ')
 * y secuencias circulares anuales que cruzan diciembre/enero (ej: [12, 1, 2] -> 'Dic–Feb').
 */
export function formatMonthRanges(months: number[]): string {
  if (!months || months.length === 0) return '';

  const uniqueSorted = Array.from(
    new Set(months.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))
  ).sort((a, b) => a - b);

  if (uniqueSorted.length === 0) return '';
  if (uniqueSorted.length === 12) return 'Todo el año';

  // 1. Extraer intervalos lineales contiguos
  const linearIntervals: MonthInterval[] = [];
  let currentStart = uniqueSorted[0];
  let currentEnd = uniqueSorted[0];

  for (let i = 1; i < uniqueSorted.length; i++) {
    const m = uniqueSorted[i];
    if (m === currentEnd + 1) {
      currentEnd = m;
    } else {
      linearIntervals.push({ start: currentStart, end: currentEnd });
      currentStart = m;
      currentEnd = m;
    }
  }
  linearIntervals.push({ start: currentStart, end: currentEnd });

  // 2. Evaluar cruce circular de año (wrap-around diciembre -> enero)
  // Si hay más de un intervalo y el primero arranca en 1 y el último termina en 12:
  const mergedIntervals: MonthInterval[] = [];

  if (
    linearIntervals.length > 1 &&
    linearIntervals[0].start === 1 &&
    linearIntervals[linearIntervals.length - 1].end === 12
  ) {
    const lastInterval = linearIntervals[linearIntervals.length - 1];
    const firstInterval = linearIntervals[0];

    // Fusionar el último (ej: 10..12) con el primero (ej: 1..3) -> 10..3
    const circularInterval: MonthInterval = {
      start: lastInterval.start,
      end: firstInterval.end,
    };

    // Agregar intervalos intermedios
    for (let i = 1; i < linearIntervals.length - 1; i++) {
      mergedIntervals.push(linearIntervals[i]);
    }
    // Agregar el circular
    mergedIntervals.push(circularInterval);
  } else {
    mergedIntervals.push(...linearIntervals);
  }

  // 3. Formatear cada intervalo a texto
  const formattedChunks = mergedIntervals.map((interval) => {
    if (interval.start === interval.end) {
      return MONTH_SHORT_NAMES[interval.start] || `M${interval.start}`;
    }
    const startName = MONTH_SHORT_NAMES[interval.start] || `M${interval.start}`;
    const endName = MONTH_SHORT_NAMES[interval.end] || `M${interval.end}`;
    return `${startName}–${endName}`;
  });

  return formattedChunks.join(' · ');
}

/**
 * Humaniza el hábito de crecimiento (growth_habit) para presentación limpia en UI.
 */
export function formatGrowthHabit(habit?: string | null): string | null {
  if (!habit || !habit.trim()) return null;
  const normalized = habit.trim().toUpperCase();

  switch (normalized) {
    case 'TREE':
    case 'ÁRBOL':
    case 'ARBOL':
      return 'Árbol';
    case 'SHRUB':
    case 'ARBUSTO':
      return 'Arbusto';
    case 'VINE':
    case 'CLIMBER':
    case 'TREPADORA':
      return 'Trepadora';
    case 'HERB':
    case 'HERBACEOUS':
    case 'HIERBA':
      return 'Hierba';
    case 'GRASS':
    case 'GRAMINOID':
    case 'GRAMÍNEA':
    case 'GRAMINEA':
      return 'Gramínea';
    case 'CACTUS':
    case 'SUCCULENT':
    case 'CACTÁCEA':
    case 'SUCULENTA':
      return 'Cactácea / Suculenta';
    default:
      return habit.trim().charAt(0).toUpperCase() + habit.trim().slice(1);
  }
}
