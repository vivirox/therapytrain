export type Usage = { day: string; amount: number; clean: number };

interface Usages {
  sessions: Array<Usage>;
  messages: Array<Usage>;
  responseTime: Array<Usage>;
}

function generateUsages(startDay: number, days: number): Usages {
  const generateUsage = (
    day: number,
    min: number,
    max: number,
    cleanPercentage: number = 0,
  ): Usage => {
    const amount = Number((Math.random() * (max - min) + min).toFixed(1));
    return {
      day: String(day),
      amount,
      clean: Number((amount * cleanPercentage).toFixed(1)),
    };
  };

  const generateSequence = (start: number, count: number) => {
    return Array.from({ length: count }, (_, i) => {
      let day = start + i;
      if (day > 31) day -= 31;
      return day;
    });
  };

  const sequence = generateSequence(startDay, days);

  return {
    sessions: sequence.map((day) => generateUsage(day, 1, 10)),
    messages: sequence.map((day) => generateUsage(day, 10, 50)),
    responseTime: sequence.map((day) => generateUsage(day, 1, 5, 0.8)),
  };
}

export const USAGE_METRICS = generateUsages(23, 14);
