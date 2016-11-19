#!/usr/bin/perl

use JSON qw(decode_json);
use POSIX qw(strftime);
use strict;

my $max_points = 1000000;
my $ifn = 'data.json';

print "read raw data from $ifn\n";
my $jsondata = '';
if (open(FILE, "<$ifn")) {
    while(<FILE>) {
        my $line = $_;
        $jsondata .= $line;
    }
    close(FILE);
} else {
    print "cannot read $ifn: $!\n";
    exit(1);
}

print "process data\n";
my $data = decode_json($jsondata);
my @times = @{$data->{'time'}};
my @totals = @{$data->{'totals'}};
my @stations = @{$data->{'stations'}};
my $npoints = (scalar(@times) < $max_points) ? scalar(@times) : $max_points;

# do each station type
my @summary;
foreach my $s (@stations) {
    my $name = $s->{'name'};
    my @sd = @{$s->{'values'}};
    my @values;
    for(my $i=0; $i<$npoints; $i++) {
        push @values, [$times[$i], $sd[$i]];
    }
    my %x;
    $x{'name'} = $name;
    $x{'values'} = \@values;
    push @summary, \%x;
}
# now the totals
my @values;
for(my $i=0; $i<$npoints; $i++) {
    push @values, [$times[$i], $totals[$i]];
}
my %x;
$x{'name'} = 'totals';
$x{'values'} = \@values;
push @summary, \%x;


save_nvd3();
save_rickshaw();
save_plottable();
save_morris();
save_dygraph();
save_mg();
save_c3();
exit(0);


# spit it out in morris
sub save_morris {
    my $ofn = 'morris-data.json';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "xkey: \"date\"\n";
        my $first = 1;
        my $cnt = 0;
        print FILE "ykeys: [";
        foreach my $x (@summary) {
            my $comma = $first ? '' : ',';
            print FILE "${comma}\"v$cnt\"";
            $first = 0;
            $cnt += 1;
        }
        print FILE "]\n";
        $first = 1;
        print FILE "labels: [";
        foreach my $x (@summary) {
            my $comma = $first ? '' : ',';
            print FILE "${comma}\"$x->{'name'}\"";
            $first = 0;
        }
        print FILE "]\n";
        print FILE "data: [\n";
        for(my $i=0; $i<$npoints; $i++) {
            print FILE "{ \"date\": $times[$i]";
            $cnt = 0;
            foreach my $s (@summary) {
                print FILE ", \"v$cnt\": $s->{'values'}->[$i][1]";
                $cnt += 1;
            }
#            foreach my $s (@stations) {
#                print FILE ", \"v$cnt\": $s->{'values'}[$i]";
#                $cnt += 1;
#            }
            print FILE "}\n";
        }
        print FILE "]\n";
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}


# spit it out in plottable
sub save_plottable {
    my $ofn = 'plottable-data.tsv';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "date";
        foreach my $x (@summary) {
            print FILE "\t$x->{'name'}";
        }
        print FILE "\n";
        for(my $i=0; $i<$npoints; $i++) {
            print FILE "$times[$i]";
            foreach my $x (@summary) {
                print FILE "\t$x->{'values'}->[$i][1]";
            }
#            foreach my $s (@stations) {
#                print FILE "\t$s->{'values'}[$i]";
#            }
            print FILE "\n";
        }
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}


# spit it out in rickshaw format
sub save_rickshaw {
    my $ofn = 'rickshaw-data.json';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "[\n";
        my $first_record = 1;
        foreach my $x (@summary) {
            print FILE "," if ! $first_record;
            print FILE "{\n";
            print FILE "\"name\": \"$x->{'name'}\",\n";
            print FILE "\"data\": [ ";
            my $first_value = 1;
            foreach my $v (@{$x->{'values'}}) {
                my $comma = ($first_value) ? '' : ',';
                print FILE "${comma} { \"x\": $v->[0], \"y\": $v->[1] }";
                $first_value = 0;
            }
            print FILE "]}\n";
            $first_record = 0;
        }
        print FILE "]\n";
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}


# spit it out in nvd3 format
sub save_nvd3 {
    my $ofn = 'nvd3-data.json';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "[\n";
        my $first_record = 1;
        foreach my $x (@summary) {
            print FILE "," if ! $first_record;
            print FILE "{\n";
            print FILE "\"key\": \"$x->{'name'}\",\n";
            print FILE "\"values\": [ ";
            my $first_value = 1;
            foreach my $v (@{$x->{'values'}}) {
                my $comma = ($first_value) ? '' : ',';
                print FILE "${comma}[$v->[0], $v->[1]]";
                $first_value = 0;
            }
            print FILE "]}\n";
            $first_record = 0;
        }
        print FILE "]\n";
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}


# spit it out in dygraph
sub save_dygraph {
    my $ofn = 'dygraph-data.csv';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "date";
        foreach my $x (@summary) {
            print FILE ",$x->{'name'}";
        }
        print FILE "\n";
        for(my $i=0; $i<$npoints; $i++) {
            print FILE strftime("%Y%m%d", localtime($times[$i]));
            foreach my $x (@summary) {
                print FILE ",$x->{'values'}->[$i][1]";
            }
#            foreach my $s (@stations) {
#                print FILE ",$s->{'values'}[$i]";
#            }
            print FILE "\n";
        }
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}


# spit it out in metricsgraphics
sub save_mg {
    my $ofn = 'mg-data.json';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "[\n";
        my $first_record = 1;
        foreach my $x (@summary) {
            next if $x->{'name'} eq 'totals';
            print FILE "," if ! $first_record;
            print FILE "[\n";
            my $first_value = 1;
            foreach my $v (@{$x->{'values'}}) {
                my $tstr = strftime("%Y-%m-%d", localtime($v->[0]));
                my $comma = ($first_value) ? '' : ',';
                print FILE "${comma}{\"date\":\"$tstr\",\"value\":$v->[1]}";
                $first_value = 0;
            }
            print FILE "]\n";
            $first_record = 0;
        }
        print FILE "]\n";
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}



# c3 data format
sub save_c3 {
    my $ofn = 'c3-data.json';
    print "save to $ofn\n";
    if (open(FILE, ">$ofn")) {
        print FILE "{\n";
        my $first_row = 1;
        foreach my $x (@summary) {
            my $comma = ($first_row) ? '' : ',';
            print FILE "${comma}\"$x->{'name'}\": [";
            my $first_value = 1;
            foreach my $v (@{$x->{'values'}}) {
                $comma = ($first_value) ? '' : ',';
                print FILE "${comma}$v->[1]";
                $first_value = 0;
            }
            print FILE "]\n";
            if($x->{'name'} eq 'totals') {
                print FILE ", \"x\": [";
                $first_value = 1;
                foreach my $v (@{$x->{'values'}}) {
                    $comma = ($first_value) ? '' : ',';
                    print FILE "${comma}\"";
                    print FILE strftime("%Y-%m-%d", localtime($v->[0]));
                    print FILE "\"";
#                    print FILE "${comma}$v->[0]";
                    $first_value = 0;
                }
                print FILE "]\n";
            }
            $first_row = 0;
        }
        print FILE "}\n";
        close(FILE);
    } else {
        print "cannot write $ofn: $!\n";
        exit(1);
    }
}
