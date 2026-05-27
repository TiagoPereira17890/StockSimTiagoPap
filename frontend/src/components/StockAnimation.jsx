import React, { useEffect, useRef, useState } from 'react';

export default function StockAnimation() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    let time = 0;
    
    // Gerar um passeio pseudo-aleatório suave
    const points = [];
    let currentY = 0;
    const numPoints = 100;
    
    for(let i=0; i<numPoints; i++) {
      points.push(currentY);
      currentY += (Math.random() - 0.5) * 10;
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;
      
      ctx.clearRect(0, 0, width, height);
      
      // Atualizar pontos
      points.shift();
      const lastY = points[points.length - 1];
      // Adicionar novo ponto com alguma inércia
      const nextY = lastY + (Math.sin(time * 0.05) * 5) + (Math.random() - 0.5) * 8;
      
      // Manter dentro de limites
      const boundedY = Math.max(Math.min(nextY, midY - 20), -midY + 20);
      points.push(boundedY);

      // O valor atual determina a cor
      const isPositive = points[points.length - 1] <= 0; // eixo Y invertido
      const color = isPositive ? '#22c55e' : '#ef4444'; // verde : vermelho
      
      ctx.beginPath();
      const sliceWidth = width / (numPoints - 1);
      
      ctx.moveTo(0, midY + points[0]);
      for(let i=1; i<numPoints; i++) {
        ctx.lineTo(i * sliceWidth, midY + points[i]);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      // Preenchimento com gradiente
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      time++;
      animationId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-6 shadow-inner relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-transparent to-transparent z-10 w-16"></div>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={128} 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
