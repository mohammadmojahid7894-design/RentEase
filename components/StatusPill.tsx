
import React from 'react';
import { PaymentStatus, ComplaintStatus } from '../types';

interface StatusPillProps {
  status: PaymentStatus | ComplaintStatus | string;
}

const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case PaymentStatus.PAID:
      case ComplaintStatus.RESOLVED:
        return 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]';
      case PaymentStatus.DUE:
      case ComplaintStatus.IN_PROGRESS:
        return 'bg-[#FFF8E1] text-[#F57F17] border-[#FFECB3]';
      case PaymentStatus.OVERDUE:
        return 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
      case PaymentStatus.PARTIAL:
        return 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]';
      default:
        return 'bg-[#F5F5F5] text-[#616161] border-[#E0E0E0]';
    }
  };

  const getLabel = () => {
    switch (status) {
      case PaymentStatus.PAID: return 'Bhari Hui'; // Hindi-ish label for Paid
      case PaymentStatus.DUE: return 'Baaki Hai';  // Due
      case PaymentStatus.OVERDUE: return 'Late Ho Gaya'; // Overdue
      case PaymentStatus.PARTIAL: return 'Thoda Baaki'; // Partial
      case ComplaintStatus.RESOLVED: return 'Theek Ho Gaya';
      case ComplaintStatus.IN_PROGRESS: return 'Kaam Chal Raha Hai';
      case ComplaintStatus.OPEN: return 'Shuru Hua';
      default: return status;
    }
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStyles()}`}>
      {getLabel()}
    </span>
  );
};

export default StatusPill;
