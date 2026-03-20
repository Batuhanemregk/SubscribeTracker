/**
 * DonutChart Component - Category spending visualization
 */
import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import type { CategoryData } from '../types';

interface DonutChartProps {
  data: CategoryData[];
  size?: number;
}

export function DonutChart({ data, size = 100 }: DonutChartProps) {
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  
  let cumulativeAngle = 0;
  
  return (
    <Svg width={size} height={size}>
      {data.map((item) => {
        const percentage = total > 0 ? item.amount / total : 0;
        const strokeDasharray = `${circumference * percentage} ${circumference}`;
        const rotation = cumulativeAngle - 90;
        cumulativeAngle += percentage * 360;
        
        return (
          <Circle
            key={item.category}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}
