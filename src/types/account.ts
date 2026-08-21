export type TradingAccountType = 'live' | 'demo' | 'prop';

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  type: TradingAccountType;
  currency: string;
  balance: number;
  riskPercent: number;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TradingAccountInput = Pick<
  TradingAccount,
  'name' | 'broker' | 'type' | 'currency' | 'balance' | 'riskPercent' | 'color'
>;

export const DEFAULT_ACCOUNT_ID = 'account-default';
