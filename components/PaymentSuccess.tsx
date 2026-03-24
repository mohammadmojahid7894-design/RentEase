import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface PaymentSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  month: string;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ isOpen, onClose, amount, transactionId, paymentMethod, month }) => {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowCheck(true), 100);
    } else {
      setShowCheck(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-6">
        {/* Animated Checkmark Bubble */}
        <div className={`transition-all duration-700 delay-100 ease-out transform ${showCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200 shadow-xl shadow-green-100/50 mb-2">
            <svg className="w-12 h-12 text-green-500 animate-[pulse_2s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <div className={`space-y-2 transition-all duration-700 delay-300 ease-out transform ${showCheck ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-3xl font-extrabold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500">Your rent has been successfully paid.</p>
        </div>

        {/* Receipt Box */}
        <div className={`w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 text-left space-y-4 shadow-sm transition-all duration-700 delay-500 ease-out transform ${showCheck ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-gray-200 border-dashed">
            <span className="text-gray-500 text-sm font-medium">Amount Paid</span>
            <span className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString('en-IN')}</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Transaction ID</span>
              <span className="text-gray-900 font-mono text-sm font-semibold">{transactionId}</span>
            </div>
            
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Rent Month</span>
              <span className="text-gray-900 font-semibold">{month}</span>
            </div>
            
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Payment Method</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{paymentMethod}</span>
            </div>
            
            <div className="flex justify-between flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Date & Time</span>
              <span className="text-gray-900 font-medium text-sm">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className={`w-full pt-4 transition-all duration-700 delay-700 ease-out transform ${showCheck ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <Button fullWidth onClick={onClose} className="h-12 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50">Done</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentSuccess;
