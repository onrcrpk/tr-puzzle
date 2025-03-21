// Harita boyutları
const width = 1200;
const height = 800;

const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("overflow", "hidden");

// Çerçeve ayarları
const frameMargin = 10;
const frameWidth = width - frameMargin * 2;
const frameHeight = height - frameMargin * 2;

// Profesyonel görünüm için kırmızı çerçeve
svg.append("rect")
  .attr("x", frameMargin)
  .attr("y", frameMargin)
  .attr("width", frameWidth)
  .attr("height", frameHeight)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 5)
  .attr("rx", 8);

// Harita projeksiyonu ayarları
const projection = d3.geoMercator()
  .center([35, 39])
  .scale(3000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// GeoJSON verisini yükle
d3.json("turkiye.geojson").then(data => {
  
  // Temel il sınırları
  svg.selectAll(".base-province")
    .data(data.features)
    .enter()
    .append("path")
    .attr("class", "base-province")
    .attr("d", path)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#bbb");

  // İl isimlerini ekle
  svg.selectAll(".province-label")
    .data(data.features)
    .enter()
    .append("text")
    .attr("class", "province-label")
    .attr("x", d => path.centroid(d)[0])
    .attr("y", d => path.centroid(d)[1])
    .text(d => d.properties.ilad)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "#444")
    .style("pointer-events", "none")
    .style("user-select", "none");

  // Parçaları karıştır ve ekle
  const shuffledData = data.features.sort(() => Math.random() - 0.5);
  const pieces = svg.selectAll(".piece")
    .data(shuffledData)
    .enter()
    .append("g")
    .attr("class", "piece");

  const frameOffset = 80;
  const totalPieces = shuffledData.length;
  const perimeter = 2 * (frameWidth + frameHeight);
  const step = perimeter / totalPieces;

  pieces.each(function(d, i) {
    let x, y;
    const distance = step * i;

    if (distance < frameWidth) {
      x = frameMargin + distance;
      y = frameMargin + frameOffset;
    } else if (distance < frameWidth + frameHeight) {
      x = frameMargin + frameWidth - frameOffset;
      y = frameMargin + (distance - frameWidth);
    } else if (distance < 2 * frameWidth + frameHeight) {
      x = frameMargin + frameWidth - (distance - frameWidth - frameHeight);
      y = frameMargin + frameHeight - frameOffset;
    } else {
      x = frameMargin + frameOffset;
      y = frameMargin + frameHeight - (distance - 2 * frameWidth - frameHeight);
    }

    const centroid = path.centroid(d);

    d3.select(this)
      .attr("transform", `translate(${x}, ${y}) scale(0.7)`)
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay(i * 20)
      .ease(d3.easeCubicOut)
      .attr("transform", `translate(${x}, ${y}) scale(1)`)
      .style("opacity", 1);

    d3.select(this).append("path")
      .attr("d", path(d))
      .attr("fill", "#ccc")
      .attr("stroke", "#333")
      .style("cursor", "grab")
      .attr("transform", `translate(${-centroid[0]},${-centroid[1]})`)
      .style("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.2))");
  });

  // Sürükleme olayları ve animasyon
  let offsetX, offsetY;
  const snapDistance = 20;

  const drag = d3.drag()
    .on("start", function(event) {
      if (d3.select(this).classed("fixed")) return;
      const [mouseX, mouseY] = [event.sourceEvent.clientX, event.sourceEvent.clientY];
      const translate = d3.select(this).attr("transform").match(/translate\(([^,]+),([^)]+)\)/);
      offsetX = mouseX - parseFloat(translate[1]);
      offsetY = mouseY - parseFloat(translate[2]);
      d3.select(this).raise().classed("active", true);
    })
    .on("drag", function(event) {
      if (d3.select(this).classed("fixed")) return;
      d3.select(this).attr("transform", `translate(${event.sourceEvent.clientX - offsetX}, ${event.sourceEvent.clientY - offsetY})`);
    })
    .on("end", function(event, d) {
      if (d3.select(this).classed("fixed")) return;
      const [finalX, finalY] = path.centroid(d);
      const currentTransform = d3.select(this).attr("transform").match(/translate\(([^,]+),([^)]+)\)/);
      const [x, y] = [parseFloat(currentTransform[1]), parseFloat(currentTransform[2])];
      const distance = Math.hypot(finalX - x, finalY - y);
    
      if (distance <= snapDistance) {
        d3.select(this)
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("transform", `translate(${finalX}, ${finalY}) scale(1.05)`)
          .transition()
          .duration(200)
          .attr("transform", `translate(${finalX}, ${finalY}) scale(1)`);
    
        d3.select(this).select("path").attr("fill", "#2a9d8f");
        d3.select(this).classed("fixed", true);
    
        d3.select(this).append("text")
        .text(d.properties.ilad)
        .attr("fill", "#ffffff")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(0,5)")
        .style("user-select", "none")
        .style("paint-order", "stroke")  // Önce kenarlığı çiz
        .style("stroke", "#000")         // Kenarlık rengi (siyah)
        .style("stroke-width", "1px");   // Kenarlık kalınlığı
      
    
        // Parça doğru yerleştirildiğinde, arka plandaki il etiketini kaldırıyoruz.
        svg.selectAll(".province-label")
          .filter(function(dd) {
            return dd.properties.ilad === d.properties.ilad;
          })
          .remove();
      }
    
      d3.select(this).classed("active", false);
    });
    

  pieces.call(drag);
});
