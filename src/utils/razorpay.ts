import Razorpay from 'razorpay';
import { config } from '../config';

const razorpayInstance = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret,
});

export default razorpayInstance;
