import React from 'react';
import Svg, { Circle, G, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

const GolfBallSVG = ({ size = 100, color = 'white', shadowColor = '#e0e0e0' }) => {
  const radius = size * 0.45;
  const center = size / 2;
  
  // Generate dimple positions in a hexagonal pattern
  const dimples = [];
  const dimpleRadius = size * 0.025;
  const spacing = size * 0.12;
  
  // Center dimples
  for (let row = -2; row <= 2; row++) {
    const numInRow = 5 - Math.abs(row);
    const rowY = center + (row * spacing * 0.866); // 0.866 = sqrt(3)/2 for hexagonal spacing
    
    for (let col = 0; col < numInRow; col++) {
      const offsetX = -(numInRow - 1) * spacing / 2;
      const x = center + offsetX + (col * spacing);
      dimples.push({ x, y: rowY });
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        {/* Gradient for 3D effect */}
        <RadialGradient id="ballGradient" cx="40%" cy="30%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity="1" />
        </RadialGradient>
        
        {/* Shadow gradient */}
        <RadialGradient id="shadowGradient">
          <Stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Shadow */}
      <Ellipse 
        cx={center} 
        cy={size * 0.95} 
        rx={radius * 0.8} 
        ry={radius * 0.2}
        fill="url(#shadowGradient)"
      />

      {/* Main ball */}
      <Circle 
        cx={center} 
        cy={center} 
        r={radius} 
        fill="url(#ballGradient)"
        stroke={shadowColor}
        strokeWidth={0.5}
      />

      {/* Dimples */}
      <G opacity="0.2">
        {dimples.map((dimple, i) => (
          <Circle
            key={i}
            cx={dimple.x}
            cy={dimple.y}
            r={dimpleRadius}
            fill={shadowColor}
          />
        ))}
      </G>

      {/* Highlight for 3D effect */}
      <Ellipse
        cx={center * 0.7}
        cy={center * 0.6}
        rx={radius * 0.3}
        ry={radius * 0.25}
        fill="white"
        opacity="0.4"
      />
    </Svg>
  );
};

export default GolfBallSVG;