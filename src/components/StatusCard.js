import React from 'react';

     const StatusCard = ({ title, value, icon, color }) => {
       return (
         <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
           <div className="flex justify-between items-start">
             <div>
               <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
               <div className="mt-1">
                 <span className="text-2xl font-bold">{value}</span>
               </div>
             </div>
             <div className={`p-3 rounded-full ${color.replace('border', 'bg').replace('-500', '-100')} text-${color.split('-')[1]}-500`}>
               {icon}
             </div>
           </div>
         </div>
       );
     };

     export default StatusCard;