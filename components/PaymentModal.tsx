import React, { useState } from 'react';
import Modal from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import Button from './Button';
import { Icons } from '../constants';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  month?: string;
  title?: string;
  subtitle?: string;
  breakdown?: { label: string; amount: number; isHighlighted?: boolean; tooltip?: string }[];
  onPaymentSuccess: (method: string, transactionId: string) => Promise<void>;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, amount, month, title, subtitle, breakdown, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bank, setBank] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);

  const handlePay = async () => {
    // Basic validation
    if (paymentMethod === 'Net Banking' && !bank) {
      alert('Please select a bank');
      return;
    }
    if (paymentMethod === 'Card' && (!cardNumber || !expiry || !cvv)) {
      alert('Please fill in complete card details');
      return;
    }
    if (paymentMethod === 'Cheque' && !chequeNo) {
      alert('Please enter cheque number');
      return;
    }

    setIsProcessing(true);
    // Simulate network delay for realistic gateway feel
    await new Promise(resolve => setTimeout(resolve, 2500));
    const txId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    await onPaymentSuccess(paymentMethod, txId);
    setIsProcessing(false);
  };

  const UPI_ID = 'rentease@upi';
  const upiUri = `upi://pay?pa=${UPI_ID}&pn=RentEase&am=${amount}&cu=INR&tn=${title ? title.replace(/\s/g, '-') : 'Payment'}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    });
  };

  // Prevent closing when processing
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Secure Payment Gateway">
      <div className="space-y-6">
        {/* Header - Amount Info */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{subtitle || 'Paying For'}</p>
            <p className="text-lg font-bold">{title || month}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm font-medium mb-1">Amount Due</p>
            <p className="text-3xl font-extrabold text-white">₹{amount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Payment Breakdown</h4>
            <div className="space-y-2">
              {breakdown.map((item, idx) => (
                <div key={idx} className={`flex justify-between items-center text-sm ${item.isHighlighted ? 'font-bold text-[#4B5EAA] bg-[#EEF2FF] p-2 rounded -mx-2' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1 group relative">
                    {item.label}
                    {item.tooltip && (
                      <div className="cursor-help text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 break-words text-center">
                          {item.tooltip}
                        </div>
                      </div>
                    )}
                  </div>
                  <span>₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between items-center font-bold text-lg text-gray-800 pt-3 mt-3 border-t border-gray-200">
                <span>Total Payable</span>
                <span>₹{amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Payment Methods Sidebar */}
          <div className="md:w-1/3 flex flex-col gap-2 border-r border-gray-100 pr-4">
            {['UPI', 'Card', 'Net Banking', 'Cheque'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                disabled={isProcessing}
                className={`text-left px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${
                  paymentMethod === method 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {method === 'UPI' && <span>📱</span>}
                {method === 'Card' && <span>💳</span>}
                {method === 'Net Banking' && <span>🏦</span>}
                {method === 'Cheque' && <span>📄</span>}
                {method}
              </button>
            ))}
          </div>

          {/* Payment Details Area */}
          <div className="md:w-2/3">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{paymentMethod} Payment</h3>
            
            <div className="min-h-[220px]">
              {/* UPI */}
              {paymentMethod === 'UPI' && (
                <div className="flex flex-col items-center gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 relative group">
                    <QRCodeSVG
                      value={upiUri}
                      size={140}
                      bgColor="#FFFFFF"
                      fgColor="#111827"
                      level="H"
                      includeMargin={true}
                    />
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">Scan to Pay</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-0.5">UPI ID</p>
                      <p className="font-mono text-sm font-semibold">{UPI_ID}</p>
                    </div>
                    <button onClick={handleCopyUpi} disabled={isProcessing} className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors">
                      {upiCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-2">Open your UPI app and scan the QR code to proceed.</p>
                </div>
              )}

              {/* Card */}
              {paymentMethod === 'Card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Card Number</label>
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000" 
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Expiry (MM/YY)</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        value={expiry}
                        onChange={e => setExpiry(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">CVV</label>
                      <input 
                        type="password" 
                        placeholder="***" 
                        value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Your card details are securely encrypted.
                  </div>
                </div>
              )}

              {/* Net Banking */}
              {paymentMethod === 'Net Banking' && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Select Bank</label>
                  <select 
                    value={bank} 
                    onChange={e => setBank(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isProcessing}
                  >
                    <option value="">-- Choose your bank --</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                    <option value="KOTAK">Kotak Mahindra Bank</option>
                  </select>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {['HDFC', 'SBI', 'ICICI'].map(popular => (
                      <button 
                        key={popular}
                        onClick={() => setBank(popular)}
                        className={`py-2 text-xs font-bold rounded border ${bank === popular ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {popular}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4 bg-blue-50/50 p-3 rounded border border-blue-100">You will be redirected to your bank's secure page to complete the payment.</p>
                </div>
              )}

              {/* Cheque */}
              {paymentMethod === 'Cheque' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Cheque Number</label>
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit cheque number" 
                      value={chequeNo}
                      onChange={e => setChequeNo(e.target.value)}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm text-yellow-800 font-medium">Please note that rent status will remain pending until the cheque is cleared by the owner.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-gray-100 flex gap-4">
          <Button variant="outline" className="w-1/3" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handlePay} disabled={isProcessing} className="w-2/3 h-12 relative overflow-hidden bg-[#2D3436] hover:bg-[#1f2425]">
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Processing Payment...</span>
              </div>
            ) : (
              <span className="flex items-center justify-center gap-2 text-lg">
                Pay ₹{amount.toLocaleString('en-IN')} Now
              </span>
            )}
            
            {!isProcessing && (
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-shine" />
            )}
          </Button>
        </div>

        <div className="text-center flex justify-center items-center gap-1.5 text-xs text-gray-400 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secured by RentEase Pay
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
