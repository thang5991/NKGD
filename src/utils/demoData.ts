import { Trade } from '../types/trade';
import { BlogPost } from '../types/blog';
import { calculateTrade } from './calculator';
import { saveTrade } from '../db/tradeRepository';
import { saveBlogPost } from '../db/blogRepository';
import { DEFAULT_ACCOUNT_ID } from '../types/account';

export async function seedDemoData(accountId = DEFAULT_ACCOUNT_ID): Promise<{ trades: number; blog: number }> {
  const now = Date.now();
  const dayMs = 86400000;

  const rawTrades = [
    {
      daysAgo: 1,
      symbol: 'EURUSD',
      side: 'Long' as const,
      market: 'Forex' as const,
      setup: 'London Breakout & Retest',
      emotion: 'Bình tĩnh' as const,
      entry: 1.0820,
      stopLoss: 1.0790,
      takeProfit: 1.0880,
      exit: 1.0875,
      lot: 1.5,
      fee: 7,
      notes: 'Entry đẹp theo mô hình CHoCH tại London open. Target chạm vùng supply H1.',
    },
    {
      daysAgo: 2,
      symbol: 'XAUUSD',
      side: 'Long' as const,
      market: 'Commodities' as const,
      setup: 'Asian Range Sweep + FVG Entry',
      emotion: 'Tự tin' as const,
      entry: 2362.5,
      stopLoss: 2355.0,
      takeProfit: 2382.0,
      exit: 2379.0,
      lot: 0.5,
      fee: 5,
      notes: 'Sweep đáy phiên Á lúc 13h30. Tạo FVG M5 vào lệnh chuẩn SL dưới swing low.',
    },
    {
      daysAgo: 3,
      symbol: 'USDJPY',
      side: 'Short' as const,
      market: 'Forex' as const,
      setup: 'Trendline Break & Rejection',
      emotion: 'Kỷ luật' as const,
      entry: 155.80,
      stopLoss: 156.20,
      takeProfit: 154.60,
      exit: 156.25,
      lot: 1.0,
      fee: 6,
      notes: 'Lệnh dính SL do tin CPI công bố biến động mạnh. Chấp nhận loss 1R theo đúng quy tắc.',
    },
    {
      daysAgo: 5,
      symbol: 'BTCUSDT',
      side: 'Long' as const,
      market: 'Crypto' as const,
      setup: 'Daily Support Bounce',
      emotion: 'Tự tin' as const,
      entry: 64200,
      stopLoss: 63100,
      takeProfit: 67000,
      exit: 66800,
      lot: 0.2,
      fee: 12,
      notes: 'Nến rút chân pinbar tại Daily 200 EMA. Chốt lời gần đỉnh cũ.',
    },
    {
      daysAgo: 7,
      symbol: 'GBPUSD',
      side: 'Short' as const,
      market: 'Forex' as const,
      setup: 'Double Top Resistance Rejection',
      emotion: 'Bình tĩnh' as const,
      entry: 1.2940,
      stopLoss: 1.2970,
      takeProfit: 1.2850,
      exit: 1.2870,
      lot: 1.2,
      fee: 8,
      notes: 'Cặp GBPUSD chạm vùng kháng cự H4 xuất hiện nến engulfing giảm.',
    },
    {
      daysAgo: 9,
      symbol: 'EURJPY',
      side: 'Long' as const,
      market: 'Forex' as const,
      setup: 'Bullish Flag Breakout',
      emotion: 'FOMO' as const,
      entry: 168.10,
      stopLoss: 167.60,
      takeProfit: 169.20,
      exit: 167.55,
      lot: 0.8,
      fee: 5,
      notes: 'Vào lệnh vội khi nến chưa đóng cửa. Bài học: luôn chờ nến H1 xác nhận đóng hoàn chỉnh.',
    },
    {
      daysAgo: 12,
      symbol: 'AUDUSD',
      side: 'Long' as const,
      market: 'Forex' as const,
      setup: 'Discount Zone Mitigation',
      emotion: 'Kỷ luật' as const,
      entry: 0.6650,
      stopLoss: 0.6625,
      takeProfit: 0.6720,
      exit: 0.6715,
      lot: 1.5,
      fee: 7,
      notes: 'Khớp lệnh tại vùng OTE Fibonacci 70.5%. R:R đạt hơn 2.5R.',
    },
  ];

  for (const item of rawTrades) {
    const calc = calculateTrade({
      side: item.side,
      entry: item.entry,
      exit: item.exit,
      stopLoss: item.stopLoss,
      takeProfit: item.takeProfit,
      lot: item.lot,
      fee: item.fee,
      symbol: item.symbol,
    });

    const tradeDate = new Date(now - item.daysAgo * dayMs);
    const dateStr = tradeDate.toISOString().slice(0, 16);

    const trade: Trade = {
      id: `demo-trade-${Math.random().toString(36).substring(2, 9)}`,
      accountId,
      date: dateStr,
      symbol: item.symbol,
      side: item.side,
      market: item.market,
      setup: item.setup,
      emotion: item.emotion,
      entry: item.entry,
      stopLoss: item.stopLoss,
      takeProfit: item.takeProfit,
      exit: item.exit,
      lot: calc.lot,
      units: calc.units,
      fee: item.fee,
      notes: item.notes,
      imageRefs: [],
      pnl: calc.pnl,
      riskAmount: calc.riskAmount,
      rMultiple: calc.rMultiple,
      plannedRR: calc.plannedRR,
      result: calc.result,
      createdAt: tradeDate.toISOString(),
      updatedAt: tradeDate.toISOString(),
    };

    await saveTrade(trade);
  }

  // Seed Blog Posts
  const demoPosts: BlogPost[] = [
    {
      id: `demo-blog-${Math.random().toString(36).substring(2, 9)}`,
      title: 'Kế hoạch Giao dịch SMC & Quản trị Rủi ro 2026',
      type: 'strategy',
      tags: ['SMC', 'RiskManagement', 'TradingPlan', 'Forex'],
      content: `## 1. Triết lý Giao dịch
- **Rủi ro tối đa mỗi lệnh**: 1.0% vốn tài khoản.
- **R:R mục tiêu tối thiểu**: 2.0R.
- **Số lệnh tối đa mỗi ngày**: 2 lệnh. Dừng giao dịch nếu thua 2 lệnh liên tiếp.

## 2. Quy trình Setup vào lệnh (Checklist)
- [ ] Xác định cấu trúc thị trường khung lớn (Daily / H4).
- [ ] Đánh dấu vùng Premium / Discount và FVG quan trọng.
- [ ] Đợi phiên (London hoặc New York) quét thanh khoản (Liquidity Sweep).
- [ ] Khung M5 xuất hiện CHoCH (Change of Character) kèm nến Imbalance.
- [ ] Entry tại OTE hoặc FVG, Stop Loss đặt an toàn sau swing high/low.

## 3. Tâm lý & Kỷ luật
- Không di chuyển Stop Loss ra xa khi giá đi ngược.
- Chốt lời từng phần 50% khi đạt 2R và kéo SL về Breakeven.`,
      imageRefs: [],
      createdAt: new Date(now - 4 * dayMs).toISOString(),
      updatedAt: new Date(now - 4 * dayMs).toISOString(),
    },
    {
      id: `demo-blog-${Math.random().toString(36).substring(2, 9)}`,
      title: 'Bài học về FOMO và Overtrading trong phiên Mỹ',
      type: 'lesson',
      tags: ['Psychology', 'FOMO', 'Lessons'],
      content: `### Tình huống
Tuần trước khi thị trường vàng (XAUUSD) tăng vọt sau tin tức, mình đã vào lệnh đuổi giá (FOMO) mà không có setup rõ ràng. Hậu quả là dính ngay nhịp pullback và mất 1.5R.

### Bài học rút ra
1. Thị trường luôn còn cơ hội: Bỏ lỡ một con sóng tăng không có nghĩa là mất tiền, nhưng nhảy vào sai thời điểm chắc chắn sẽ mất tiền.
2. Thiết lập quy tắc "30 Phút": Sau khi có tin tức mạnh, tuyệt đối không vào lệnh trong 30 phút đầu tiên để thị trường hình thành cấu trúc ổn định.
3. Luôn sử dụng Position Calculator để tính chính xác Lot trước khi nhấn nút.`,
      imageRefs: [],
      createdAt: new Date(now - 10 * dayMs).toISOString(),
      updatedAt: new Date(now - 10 * dayMs).toISOString(),
    },
  ];

  for (const post of demoPosts) {
    await saveBlogPost(post);
  }

  return { trades: rawTrades.length, blog: demoPosts.length };
}
