import { ComplianceRuleId } from '../types/trade';

export interface ComplianceRule {
  id: ComplianceRuleId;
  label: string;
  description: string;
  violationLabel: string;
  weight: number;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'valid_setup',
    label: 'Đúng Setup / Playbook',
    description: 'Lệnh đáp ứng đúng mô hình đã định nghĩa',
    violationLabel: 'Vào lệnh ngoài Setup',
    weight: 15,
  },
  {
    id: 'waited_confirmation',
    label: 'Chờ đủ xác nhận',
    description: 'Không vào sớm, đuổi giá hoặc bỏ qua tín hiệu',
    violationLabel: 'Không chờ đủ xác nhận',
    weight: 15,
  },
  {
    id: 'risk_limit',
    label: 'Đúng giới hạn rủi ro',
    description: 'Lot và mức risk nằm trong kế hoạch',
    violationLabel: 'Vượt giới hạn rủi ro',
    weight: 20,
  },
  {
    id: 'stop_loss_discipline',
    label: 'Tuân thủ Stop Loss',
    description: 'Không nới hoặc hủy Stop Loss để né thua',
    violationLabel: 'Nới hoặc bỏ Stop Loss',
    weight: 15,
  },
  {
    id: 'trade_frequency',
    label: 'Không Overtrade',
    description: 'Không vượt số lệnh hoặc tần suất cho phép',
    violationLabel: 'Overtrade',
    weight: 10,
  },
  {
    id: 'emotional_control',
    label: 'Kiểm soát cảm xúc',
    description: 'Không FOMO, revenge trade hoặc vào lệnh bốc đồng',
    violationLabel: 'FOMO / Revenge trade',
    weight: 10,
  },
  {
    id: 'exit_plan',
    label: 'Thoát lệnh đúng kế hoạch',
    description: 'Không chốt non hoặc giữ lệnh ngoài kịch bản',
    violationLabel: 'Thoát lệnh sai kế hoạch',
    weight: 15,
  },
];

export function calculateComplianceScore(violatedRules: ComplianceRuleId[]): number {
  const violations = new Set(violatedRules);
  const penalty = COMPLIANCE_RULES
    .filter((rule) => violations.has(rule.id))
    .reduce((sum, rule) => sum + rule.weight, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function complianceGrade(score: number): { label: string; className: string } {
  if (score === 100) return { label: 'Tuân thủ đầy đủ', className: 'text-profit' };
  if (score >= 80) return { label: 'Kỷ luật tốt', className: 'text-accent' };
  if (score >= 60) return { label: 'Cần cải thiện', className: 'text-amber' };
  return { label: 'Phá kỷ luật', className: 'text-loss' };
}
