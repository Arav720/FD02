// utils/razorpayService.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import axios, { AxiosResponse } from 'axios';

dotenv.config();

// Type definitions
interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

interface BankAccountDetails {
  accountHolderName: string;
  ifsc: string;
  accountNumber: string;
}

interface ContactData {
  name: string;
  email: string;
  contact: string;
  type: string;
  reference_id: string;
  notes: {
    librarian_id: string;
    librarian_email: string;
  };
}

interface FundAccountData {
  contact_id: string;
  account_type: string;
  bank_account: {
    name: string;
    ifsc: string;
    account_number: string;
  };
}

interface OrderData {
  amount: number;
  currency: string;
  receipt: string;
  payment_capture: number;
  notes: {
    platform_fee_percentage: string;
  };
}

interface PayoutData {
  account_number: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  mode: string;
  purpose: string;
  queue_if_low_balance: boolean;
  reference_id: string;
  narration: string;
}

interface RazorpayOrder {
  id: string;
  currency: string;
  [key: string]: any;
}

interface CreateOrderResult {
  order: RazorpayOrder;
  platformFee: number;
}

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

const createRazorpayContact = async (user: User): Promise<any> => {
  try {
    const contactPhoneNumber: string = user.phone || '9000090000'; // Use real phone in production
    const userId: string = user._id?.toString() || user.id?.toString() || '';

    const contactData: ContactData = {
      name: user.name,
      email: user.email,
      contact: contactPhoneNumber,
      type: 'vendor',
      reference_id: userId,
      notes: {
        librarian_id: userId,
        librarian_email: user.email,
      }
    };

    console.log('Sending to Razorpay Contact API (via axios):', JSON.stringify(contactData, null, 2));

    const response: AxiosResponse = await axios.post(
      'https://api.razorpay.com/v1/contacts',
      contactData,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID as string,
          password: process.env.RAZORPAY_KEY_SECRET as string
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data; // Contains the contact object from Razorpay
  } catch (error: any) {
    console.error('Error creating Razorpay Contact:', error.message);

    if (error.response?.data) {
      console.error('Razorpay API Error:', JSON.stringify(error.response.data, null, 2));
    }

    throw error;
  }
};

const createRazorpayFundAccount = async (contactId: string, bankAccountDetails: BankAccountDetails): Promise<any> => {
  try {
    const fundAccountData: FundAccountData = {
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: bankAccountDetails.accountHolderName,
        ifsc: bankAccountDetails.ifsc,
        account_number: bankAccountDetails.accountNumber,
      },
    };

    console.log('Sending to Razorpay Fund Account API:', JSON.stringify(fundAccountData, null, 2));

    const response: AxiosResponse = await axios.post(
      'https://api.razorpay.com/v1/fund_accounts',
      fundAccountData,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID as string,
          password: process.env.RAZORPAY_KEY_SECRET as string,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data; // Contains the created fund account object
  } catch (error: any) {
    console.error('Error creating Razorpay Fund Account:', error.message);
    
    if (error.response?.data) {
      console.error('Razorpay API Error Response:', JSON.stringify(error.response.data, null, 2));
    }

    throw error;
  }
};

const createRazorpayOrder = async (totalAmount: number, currency: string, platformFeePercentage: number = 0): Promise<CreateOrderResult> => {
  try {
    console.log('Input amount:', totalAmount); // Should log 600
  
    const amountInPaise = totalAmount * 100; // Should be 60000
    console.log('Amount in paise:', amountInPaise); // Should log 60000
  
    const orderData = {
      amount: amountInPaise, // 60000 paise = ₹600
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };
  
    console.log('Order Data Sending to Razorpay:', orderData);

    const response: AxiosResponse = await axios.post(
      'https://api.razorpay.com/v1/orders',
      orderData,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID as string,
          password: process.env.RAZORPAY_KEY_SECRET as string,
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return {
      order: response.data,
      platformFee: amountInPaise / 100,
    };
  } catch (error: any) {
    console.error('❌ Razorpay Order Creation Failed:', error.response?.data || error.message);
    throw new Error('Failed to create Razorpay order');
  }
};

//For creating payout data required
//https://api.razorpay.com/v1/payouts
// {
//   "account_number": "7878780080316316",
//   "fund_account_id": "fa_00000000000001",
//   "amount": 1000000,
//   "currency": "INR",
//   "mode": "IMPS",
//   "purpose": "refund",
//   "queue_if_low_balance": true,
//   "reference_id": "Acme Transaction ID 12345",
//   "narration": "Acme Corp Fund Transfer",
//   "notes": {
//     "notes_key_1":"Tea, Earl Grey, Hot",
//     "notes_key_2":"Tea, Earl Grey… decaf."
//   }
// }

const createPayout = async (amountInPaise: number, fundAccountId: string, referenceId: string): Promise<any> => {
  try {
    console.log('Sending to Razorpay Payout API (via axios):');
    const data: PayoutData = {
      account_number: process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER as string, // Your virtual account number
      fund_account_id: fundAccountId, // Vendor's fund account ID
      amount: amountInPaise, // Must be in paise
      currency: 'INR',
      mode: 'IMPS', // Can also be NEFT, UPI
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: 'Library booking payout',
    };
    
    console.log("data", data);
    
    const response: AxiosResponse = await axios.post(
      'https://api.razorpay.com/v1/payouts',
      data,
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID as string,
          password: process.env.RAZORPAY_KEY_SECRET as string,
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    console.log("Response data in payout ", response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Razorpay Payout Failed:', error.response?.data || error.message);
    throw new Error('Failed to send payout to vendor');
  }
};

// Export functions (ES6 modules syntax)
export {
  createRazorpayContact,
  createRazorpayFundAccount,
  createRazorpayOrder,
  createPayout
};