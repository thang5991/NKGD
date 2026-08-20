export interface MarketSession {
  id: 'asia' | 'europe' | 'america';
  name: string;
  city: string;
  timeZone: string;
  openHour: number;
  closeHour: number;
  localTime: string;
  isOpen: boolean;
}

function hourInTimeZone(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}

function timeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getMarketSessions(date: Date): MarketSession[] {
  const definitions = [
    { id: 'asia' as const, name: 'Phiên Á', city: 'Tokyo', timeZone: 'Asia/Tokyo' },
    { id: 'europe' as const, name: 'Phiên Âu', city: 'London', timeZone: 'Europe/London' },
    { id: 'america' as const, name: 'Phiên Mỹ', city: 'New York', timeZone: 'America/New_York' },
  ];

  return definitions.map((session) => {
    const hour = hourInTimeZone(date, session.timeZone);
    return {
      ...session,
      openHour: 8,
      closeHour: 17,
      localTime: timeInTimeZone(date, session.timeZone),
      isOpen: hour >= 8 && hour < 17,
    };
  });
}

export function getActiveSessionLabel(sessions: MarketSession[]): string {
  const active = sessions.filter((session) => session.isOpen);
  if (active.length === 0) return 'Ngoài giờ các phiên chính';
  return active.map((session) => session.name.replace('Phiên ', '')).join(' + ');
}
