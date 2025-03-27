import React, { useEffect, useState } from 'react';
     import { Line } from 'react-chartjs-2';
     import {
       Chart as ChartJS,
       CategoryScale,
       LinearScale,
       PointElement,
       LineElement,
       Title,
       Tooltip,
       Legend,
     } from 'chart.js';

     ChartJS.register(
       CategoryScale,
       LinearScale,
       PointElement,
       LineElement,
       Title,
       Tooltip,
       Legend
     );

     const SensorChart = ({ data, label, color, title }) => {
       const [chartData, setChartData] = useState({
         labels: [],
         datasets: [
           {
             label,
             data: [],
             borderColor: color,
             backgroundColor: color.replace('1)', '0.2)'),
             tension: 0.4,
           },
         ],
       });

       useEffect(() => {
         if (data && data.length > 0) {
           const labels = data.map((_, index) => {
             return `${index * 5}s ago`;
           }).reverse();

           setChartData({
             labels,
             datasets: [
               {
                 label,
                 data: [...data].reverse(),
                 borderColor: color,
                 backgroundColor: color.replace('1)', '0.2)'),
                 tension: 0.4,
               },
             ],
           });
         }
       }, [data, label, color]);

       const options = {
         responsive: true,
         plugins: {
           legend: {
             position: 'top',
           },
           title: {
             display: true,
             text: title,
           },
         },
         scales: {
           y: {
             beginAtZero: true,
           },
         },
         animation: {
           duration: 0
         },
       };

       return <Line options={options} data={chartData} />;
     };

     export default SensorChart;