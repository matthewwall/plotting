function makeData() {
  "use strict";

  return [
    { id: "0", r1: 0, r2: 1, t1: -55, t2: 55 },
    { id: "1", r1: 0, r2: 1, t1: 180, t2: 300 },
    { id: "2", r1: 0, r2: 1, t1: 70, t2: 150 },
    { id: "3", r1: 1, r2: 2, t1: -40, t2: 20 },
    { id: "4", r1: 1, r2: 2, t1: 250, t2: 280 },
    { id: "5", r1: 1, r2: 2, t1: 80, t2: 160 },
    { id: "6", r1: 2, r2: 3, t1: -60, t2: 60 },
    { id: "7", r1: 2, r2: 3, t1: 180, t2: 220 },
    { id: "8", r1: 3, r2: 4, t1: 60, t2: 180 }
  ];
}

function run(svg, data, Plottable) {
  "use strict";
  var cs = new Plottable.Scales.Color();
  var rScale = new Plottable.Scales.Linear().domain([0, 4]);
  var legend = new Plottable.Components.Legend(cs);

  var wheel = new Plottable.Plots.Wheel()
    .addDataset(new Plottable.Dataset(data))
    .r(function(d){ return d.r1; }, rScale)
    .r2(function(d){ return d.r2; })
    .t(function(d){ return d.t1; })
    .t2(function(d){ return d.t2; })
    .attr("fill", function(d){ return "" + d.id.toString(); }, cs);

  var yScale = new Plottable.Scales.Linear().domain([0, 4]);
  var xScale = new Plottable.Scales.Linear().domain([-70, 310]);

  var rectangle = new Plottable.Plots.Rectangle()
    .addDataset(new Plottable.Dataset(data))
    .x(function(d){ return d.t1; }, xScale)
    .x2(function(d){ return d.t2; })
    .y(function(d){ return d.r1; }, yScale)
    .y2(function(d){ return d.r2; })
    .attr("fill", function(d){ return "" + d.id.toString(); }, cs);

   new Plottable.Components.Table([[null, rectangle],
                                   [legend, wheel]]).renderTo(svg);
}
