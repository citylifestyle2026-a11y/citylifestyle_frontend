import { configureStore } from "@reduxjs/toolkit";
import authReducer from './auth/authSlice';
import userReducer from './user/userSlice';
import eventReducer from './event/eventSlice';
import ticketTypeReducer from "./ticketType/ticketTypeSlice";
import bookingReducer from '../redux/booking/bookingSlice';
import bookingTicketReducer from "../redux/bookingTicket/bookingTicketSlice";
import qrReducer from "../redux/qr/qrSlice";
import entryReportReducer from "../redux/entryReport/entryReportSlice";
import dashboardReducer from "./dashboard/dashboardSlice";
import adminReducer from "./admin/adminSlice";
import contactReducer from "./contact/contactSlice";
import companyCategoryReducer from "./companyCategory/companyCategorySlice";
export const store = configureStore({
    reducer: {
        auth: authReducer,
        user: userReducer,
        event: eventReducer,
        ticketType: ticketTypeReducer,
        booking: bookingReducer,
        bookingTicket: bookingTicketReducer,
        qr: qrReducer,  
        entryReport: entryReportReducer,
         dashboard: dashboardReducer, 
        admin: adminReducer,
        contact: contactReducer,
        companyCategory: companyCategoryReducer,
    }

})