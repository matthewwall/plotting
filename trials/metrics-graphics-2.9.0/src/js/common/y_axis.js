function y_rug (args) {
  'use strict';
  args.rug_buffer_size = args.chart_type === 'point'
    ? args.buffer / 2
    : args.buffer * 2 / 3;

  var rug = mg_make_rug(args, 'mg-y-rug');

  rug.attr('x1', args.left + 1)
    .attr('x2', args.left + args.rug_buffer_size)
    .attr('y1', args.scalefns.yf)
    .attr('y2', args.scalefns.yf);

  mg_add_color_accessor_to_rug(rug, args, 'mg-y-rug-mono');
}

MG.y_rug = y_rug;

function mg_change_y_extents_for_bars (args, my) {
  if (args.chart_type === 'bar') {
    my.min = 0;
    my.max = d3.max(args.data[0], function (d) {
      var trio = [];
      trio.push(d[args.y_accessor]);

      if (args.baseline_accessor !== null) {
        trio.push(d[args.baseline_accessor]);
      }

      if (args.predictor_accessor !== null) {
        trio.push(d[args.predictor_accessor]);
      }

      return Math.max.apply(null, trio);
    });
  }
  return my;
}

function mg_compute_yax_format (args) {
  var yax_format = args.yax_format;
  if (!yax_format) {
    if (args.format === 'count') {
      // increase decimals if we have small values, useful for realtime data
      if (args.processed.max_y < 0.0001) {
        args.decimals = 6;
      } else if (args.processed.max_y < 0.1) {
        args.decimals = 4;
      }

      yax_format = function (f) {
        if (f < 1.0) {
          // Don't scale tiny values.
          return args.yax_units + d3.round(f, args.decimals);
        } else {
          var pf = d3.formatPrefix(f);
          return args.yax_units + pf.scale(f) + pf.symbol;
        }
      };
    } else { // percentage
      yax_format = function (d_) {
        var n = d3.format('.2p');
        return n(d_);
      };
    }
  }
  return yax_format;
}

function mg_bar_add_zero_line (args) {
  var svg = mg_get_svg_child_of(args.target);
  var extents = args.scales.X.domain();
  if (0 >= extents[0] && extents[1] >= 0) {
    var r = args.scales.Y_ingroup.range();
    var g = args.categorical_groups.length ? args.scales.Y_outgroup(args.categorical_groups[args.categorical_groups.length-1]) : args.scales.Y_outgroup()
    svg.append('svg:line')
    .attr('x1', args.scales.X(0))
    .attr('x2', args.scales.X(0))
    .attr('y1', r[0] + mg_get_plot_top(args))
    .attr('y2', r[r.length-1] + g + args.scales.Y_ingroup.rangeBand())
    .attr('stroke', 'black')
    .attr('opacity', .2);
  }
}

function set_min_max_y (args) {
  // flatten data
  // remove weird data, if log.
  var data = mg_flatten_array(args.data);

  if (args.y_scale_type === 'log') {
    data = data.filter(function (d) {
      return d[args.y_accessor] > 0;
    });
  }

  if (args.baselines) {
    data = data.concat(args.baselines);
  }

  var extents = d3.extent(data, function (d) {
    return d[args.y_accessor];
  });

  var my = {};
  my.min = extents[0];
  my.max = extents[1];
  // the default case is for the y-axis to start at 0, unless we explicitly want it
  // to start at an arbitrary number or from the data's minimum value
  if (my.min >= 0 && !args.min_y && !args.min_y_from_data) {
    my.min = 0;
  }

  mg_change_y_extents_for_bars(args, my);
  my.min = (args.min_y !== null)
    ? args.min_y
    : my.min;

  my.max = (args.max_y !== null)
    ? args.max_y
    : (my.max < 0)
      ? my.max + (my.max - my.max * args.inflator)
      : my.max * args.inflator;

  if (args.y_scale_type !== 'log' && my.min < 0) {
    my.min = my.min - (my.min - my.min * args.inflator);
  }

  if (!args.min_y && args.min_y_from_data) {

      var buff = (my.max - my.min) *.01;
      my.min = extents[0] - buff;
      my.max = extents[1] + buff;
  }
  args.processed.min_y = my.min;
  args.processed.max_y = my.max;
}

function mg_y_domain_range (args, scale) {
  scale.domain([args.processed.min_y, args.processed.max_y])
    .range([mg_get_plot_bottom(args), args.top]);
  return scale;
}

function mg_define_y_scales (args) {
  var scale = args.y_scale_type === 'log' ? d3.scale.log() : d3.scale.linear();
  if (args.y_scale_type === 'log') {
    if (args.chart_type === 'histogram') {
      // log histogram plots should start just below 1
      // so that bins with single counts are visible
      args.processed.min_y = 0.2;
    } else {
      if (args.processed.min_y <= 0) {
        args.processed.min_y = 1;
      }
    }
  }
  args.scales.Y = mg_y_domain_range(args, scale);
  args.scales.Y.clamp(args.y_scale_type === 'log');

  // used for ticks and such, and designed to be paired with log or linear
  args.scales.Y_axis = mg_y_domain_range(args, d3.scale.linear());
}

function mg_add_y_label (g, args) {
  if (args.y_label) {
    g.append('text')
      .attr('class', 'label')
      .attr('x', function () {
        return -1 * (mg_get_plot_top(args) +
        ((mg_get_plot_bottom(args)) - (mg_get_plot_top(args))) / 2);
      })
      .attr('y', function () {
        return args.left / 2;
      })
      .attr('dy', '0.4em')
      .attr('text-anchor', 'middle')
      .text(function (d) {
        return args.y_label;
      })
      .attr('transform', function (d) {
        return 'rotate(-90)';
      });
  }
}

function mg_add_y_axis_rim (g, args) {
  var tick_length = args.processed.y_ticks.length;
  if (!args.x_extended_ticks && !args.y_extended_ticks && tick_length) {
    var y1scale, y2scale;

    if (args.axes_not_compact && args.chart_type !== 'bar') {
      y1scale = args.height - args.bottom;
      y2scale = args.top;
    } else if (tick_length) {
      y1scale = args.scales.Y(args.processed.y_ticks[0]).toFixed(2);
      y2scale = args.scales.Y(args.processed.y_ticks[tick_length - 1]).toFixed(2);
    } else {
      y1scale = 0;
      y2scale = 0;
    }

    g.append('line')
      .attr('x1', args.left)
      .attr('x2', args.left)
      .attr('y1', y1scale)
      .attr('y2', y2scale);
  }
}

function mg_add_y_axis_tick_lines (g, args) {
  g.selectAll('.mg-yax-ticks')
    .data(args.processed.y_ticks).enter()
    .append('line')
    .classed('mg-extended-y-ticks', args.y_extended_ticks)
    .attr('x1', args.left)
    .attr('x2', function () {
      return (args.y_extended_ticks)
        ? args.width - args.right
        : args.left - args.yax_tick_length;
    })
    .attr('y1', function (d) { return args.scales.Y(d).toFixed(2); })
    .attr('y2', function (d) { return args.scales.Y(d).toFixed(2); });
}

function mg_add_y_axis_tick_labels (g, args) {
  var yax_format = mg_compute_yax_format(args);
  g.selectAll('.mg-yax-labels')
    .data(args.processed.y_ticks).enter()
    .append('text')
    .attr('x', args.left - args.yax_tick_length * 3 / 2)
    .attr('dx', -3)
    .attr('y', function (d) {
      return args.scales.Y(d).toFixed(2);
    })
    .attr('dy', '.35em')
    .attr('text-anchor', 'end')
    .text(function (d) {
      var o = yax_format(d);
      return o;
    });
}

function y_axis (args) {
  if (!args.processed) {
    args.processed = {};
  }

  var svg = mg_get_svg_child_of(args.target);

  set_min_max_y(args);
  MG.call_hook('y_axis.process_min_max', args, args.processed.min_y, args.processed.max_y);

  mg_define_y_scales(args);
  mg_add_scale_function(args, 'yf', 'Y', args.y_accessor);

  mg_selectAll_and_remove(svg, '.mg-y-axis');

  if (!args.y_axis) { return this; }

  var g = mg_add_g(svg, 'mg-y-axis');
  mg_add_y_label(g, args);
  mg_process_scale_ticks(args, 'y');
  mg_add_y_axis_rim(g, args);
  mg_add_y_axis_tick_lines(g, args);
  mg_add_y_axis_tick_labels(g, args);

  if (args.y_rug) { y_rug(args); }

  return this;
}

MG.y_axis = y_axis;

function mg_add_categorical_labels (args) {
  var svg = mg_get_svg_child_of(args.target);
  mg_selectAll_and_remove(svg, '.mg-y-axis');
  var g = mg_add_g(svg, 'mg-y-axis');
  var group_g;
  (args.categorical_groups.length ? args.categorical_groups : ['1']).forEach(function(group){
    group_g = mg_add_g(g, 'mg-group-' + mg_normalize(group))

    if (args.group_accessor) {
      mg_add_group_label(group_g, group, args);
    }
    else {
      var labels = mg_add_graphic_labels(group_g, group, args);
      mg_rotate_labels(labels, args.rotate_y_labels);
    }
  });
}

function mg_add_graphic_labels (g, group, args) {
  return g.selectAll('text').data(args.categorical_variables).enter().append('svg:text')
      .attr('x', args.left - args.buffer)
      .attr('y', function (d) {
        return args.scales.Y_outgroup(group) + args.scales.Y_ingroup(d) + args.scales.Y_ingroup.rangeBand() / 2;
      })
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .text(String);
}

function mg_add_group_label (g, group, args) {
    g.append('svg:text')
      .classed('mg-barplot-group-label', true)
      .attr('x', args.left - args.buffer)
      .attr('y', args.scales.Y_outgroup(group) + args.scales.Y_outgroup.rangeBand()/2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .text(group);
}



function y_axis_categorical (args) {
  // in_group_scale
  mg_add_categorical_scale(args, 'Y_ingroup', args.categorical_variables, 0, args.group_height, args.bar_padding_percentage, args.bar_outer_padding_percentage);
  mg_add_scale_function(args, 'yf_in', 'Y_ingroup', args.y_accessor);
  // out_group_scale
  if (args.group_accessor) {
      mg_add_categorical_scale(args, 'Y_outgroup', args.categorical_groups, mg_get_plot_top(args), mg_get_plot_bottom(args), args.group_padding_percentage, args.group_outer_padding_percentage);
      mg_add_scale_function(args, 'yf_out', 'Y_outgroup', args.group_accessor);
  }
  else {
    args.scales.Y_outgroup = function(d) { return mg_get_plot_top(args)};
    args.scalefns.yf_out = function(d) {return mg_get_plot_top(args)};
  }
  if (!args.y_axis) { return this; }
  mg_add_categorical_labels(args);

  if (args.show_bar_zero) mg_bar_add_zero_line(args);

  return this;
}

MG.y_axis_categorical = y_axis_categorical;
