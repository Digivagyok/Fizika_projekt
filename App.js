import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Svg, { G, Line, Polyline, Text as SvgText } from 'react-native-svg';

const UPDATE_INTERVAL_MS = 100;
const MAX_SAMPLES = 240;
const CALIBRATION_MS = 8000;

function format(value) {
  return value.toFixed(2);
}

function magnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function getGridValues(minValue, maxValue, step) {
  const values = [];
  const start = Math.ceil(minValue / step) * step;

  for (let v = start; v <= maxValue; v += step) {
    values.push(v);
  }

  return values;
}

function toPoints(data, width, height, minValue, maxValue) {
  if (data.length < 2) {
    return `0,${height / 2} ${width},${height / 2}`;
  }

  const range = Math.max(0.001, maxValue - minValue);

  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const clamped = Math.max(minValue, Math.min(maxValue, value));
      const normalized = (clamped - minValue) / range;
      const y = height - normalized * height;
      return `${x},${y}`;
    })
    .join(' ');
}

export default function App() {
  const [raw, setRaw] = useState({ x: 0, y: 0, z: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0, z: 0 });
  const [samples, setSamples] = useState([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [recordingStoppedAt, setRecordingStoppedAt] = useState(null);

  useEffect(() => {
    Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const sub = Magnetometer.addListener((next) => {
      const current = { x: next.x, y: next.y, z: next.z };
      setRaw(current);
    });

    return () => sub.remove();
  }, []);

  const corrected = useMemo(
    () => ({
      x: raw.x - offset.x,
      y: raw.y - offset.y,
      z: raw.z - offset.z,
    }),
    [raw, offset]
  );

  const totalB = useMemo(() => magnitude(corrected), [corrected]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const point = {
      ...corrected,
      m: totalB,
      t: Date.now(),
    };

    setSamples((prev) => [...prev.slice(-(MAX_SAMPLES - 1)), point]);
  }, [corrected, totalB, isRecording]);

  const chartData = useMemo(() => samples.map((s) => s.m), [samples]);

const chartMin = useMemo(() => {
  if (chartData.length === 0) {
    return 0;
  }

  if (autoScale) {
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    if (Math.abs(max - min) < 1) {
      return Math.max(0, min - 5);
    }
    return Math.max(0, Math.floor(min / 10) * 10);
  }

  return 0;
}, [chartData, autoScale]);

const chartMax = useMemo(() => {
  if (chartData.length === 0) {
    return 100;
  }

  if (autoScale) {
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    if (Math.abs(max - min) < 1) {
      return max + 5;
    }
    return Math.ceil(max / 10) * 10;
  }

  return 100;
}, [chartData, autoScale]);

const gridValues = useMemo(() => {
  return getGridValues(chartMin, chartMax, 10);
}, [chartMin, chartMax]);

const chartPoints = useMemo(() => {
  return toPoints(chartData, 320, 180, chartMin, chartMax);
}, [chartData, chartMin, chartMax]);

const startRecording = () => {
  setSamples([]);
  setRecordingStartedAt(Date.now());
  setRecordingStoppedAt(null);
  setIsRecording(true);
};

const stopRecording = () => {
  setIsRecording(false);
  setRecordingStoppedAt(Date.now());
};

  const startCalibration = async () => {
    if (isCalibrating) {
      return;
    }

    setIsCalibrating(true);

    const minVals = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, z: Number.POSITIVE_INFINITY };
    const maxVals = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY };

    const tempSamples = [];
    const tempSub = Magnetometer.addListener((next) => {
      tempSamples.push(next);
      minVals.x = Math.min(minVals.x, next.x);
      minVals.y = Math.min(minVals.y, next.y);
      minVals.z = Math.min(minVals.z, next.z);
      maxVals.x = Math.max(maxVals.x, next.x);
      maxVals.y = Math.max(maxVals.y, next.y);
      maxVals.z = Math.max(maxVals.z, next.z);
    });

    await new Promise((resolve) => setTimeout(resolve, CALIBRATION_MS));

    tempSub.remove();

    if (tempSamples.length < 10) {
      Alert.alert('Kalibráció sikertelen', 'Nem elég szenzor adat lett felvétel.');
      setIsCalibrating(false);
      return;
    }

    setOffset({
      x: (maxVals.x + minVals.x) / 2,
      y: (maxVals.y + minVals.y) / 2,
      z: (maxVals.z + minVals.z) / 2,
    });

    setIsCalibrating(false);
    Alert.alert('Kalibráció befejezve', 'Mozgassa a telefont egy 8-as alakzatban a legjobb eredményért.');
  };

  
  const exportCsv = async () => {
    if (samples.length === 0) {
      Alert.alert('Nincs adat', 'Előbb készíts egy mérést.');
      return;
    }

    if (isRecording) {
      Alert.alert('Mérés folyamatban', 'Exportálás előtt állítsd le a mérést.');
      return;
    }

    try {
      const metadata = [
        `recording_started_ms,${recordingStartedAt ?? ''}`,
        `recording_stopped_ms,${recordingStoppedAt ?? ''}`,
        `sample_interval_ms,${UPDATE_INTERVAL_MS}`,
        `sample_count,${samples.length}`,
        `offset_x_uT,${offset.x.toFixed(4)}`,
        `offset_y_uT,${offset.y.toFixed(4)}`,
        `offset_z_uT,${offset.z.toFixed(4)}`,
        '',
      ];

      const header = 'timestamp_ms,x_uT,y_uT,z_uT,magnitude_uT';
      const rows = samples.map(
        (s) =>
          `${s.t},${s.x.toFixed(4)},${s.y.toFixed(4)},${s.z.toFixed(4)},${s.m.toFixed(4)}`
      );
      const csv = [...metadata, header, ...rows].join('\n');

      const file = new File(Paths.cache, `magnetometer_${Date.now()}.csv`);
      file.create({ overwrite: true });
      file.write(csv);

      const uri = file.uri;

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export magnetic field data',
        });
        return;
      }

      Alert.alert(
        'CSV saved',
        Platform.select({
          web: 'Sharing is not available in web mode.',
          default: `CSV file path: ${uri}`,
        })
      );
    } catch (error) {
      Alert.alert('Export error', error?.message || 'Failed to write CSV file.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mágneses térerősségmérő</Text>
        <Text style={styles.subtitle}>Az értékek mikroteszlában vannak megadva (uT)</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Szenzor adatok</Text>
          <Text style={styles.row}>X: {format(corrected.x)}</Text>
          <Text style={styles.row}>Y: {format(corrected.y)}</Text>
          <Text style={styles.row}>Z: {format(corrected.z)}</Text>
          <Text style={styles.magnitude}>|B|: {format(totalB)} uT</Text>
        </View>

        <View style={styles.card}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.cardTitle}>Aktuális mérési görbe</Text>

          <Pressable
            style={[styles.smallButton, !showChart && styles.smallButtonInactive]}
            onPress={() => setShowChart((prev) => !prev)}
          >
            <Text style={styles.smallButtonText}>
              {showChart ? 'Grafikon elrejtése' : 'Grafikon mutatása'}
            </Text>
          </Pressable>
        </View>

        {showChart && (
          <>
            <View style={styles.chartControlsRow}>
              <Pressable
                style={[styles.smallButton, autoScale && styles.smallButtonActive]}
                onPress={() => setAutoScale(true)}
              >
                <Text style={styles.smallButtonText}>Auto scale</Text>
              </Pressable>

              <Pressable
                style={[styles.smallButton, !autoScale && styles.smallButtonActive]}
                onPress={() => setAutoScale(false)}
              >
                <Text style={styles.smallButtonText}>Fix scale</Text>
              </Pressable>
            </View>

            <Text style={styles.chartInfo}>
              Skála: {format(chartMin)} - {format(chartMax)} uT
            </Text>

            <Svg width="100%" height={180} viewBox="0 0 320 180">
              {gridValues.map((value) => {
                const y =
                  180 - ((value - chartMin) / Math.max(0.001, chartMax - chartMin)) * 180;

                return (
                  <G key={value}>
                    <Line
                      x1="0"
                      y1={y}
                      x2="320"
                      y2={y}
                      stroke="#c7d6e2"
                      strokeWidth="1"
                    />
                    <SvgText
                      x="4"
                      y={Math.max(12, y - 2)}
                      fontSize="9"
                      fill="#5a768c"
                    >
                      {value} uT
                    </SvgText>
                  </G>
                );
              })}

              <Polyline
                points={chartPoints}
                fill="none"
                stroke="#1b6ca8"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          </>
        )}
      </View>

        <View style={styles.buttonRow}>
          {!isRecording ? (
            <Pressable style={[styles.button, styles.recordButton]} onPress={startRecording}>
              <Text style={styles.buttonText}>Mérés indítása</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.button, styles.stopButton]} onPress={stopRecording}>
              <Text style={styles.buttonText}>Mérés leállítása</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, isCalibrating && styles.buttonDisabled]}
            onPress={startCalibration}
            disabled={isCalibrating || isRecording}
          >
            <Text style={styles.buttonText}>
              {isCalibrating ? 'Kalibrálás...' : '8s kalibráció'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, styles.exportButton, isRecording && styles.buttonDisabled]}
          onPress={exportCsv}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>Export CSV</Text>
        </Pressable>

        <Text style={styles.info}>
          Állapot: {isRecording ? 'felvétel folyamatban' : 'nincs aktív mérés'}
        </Text>
        <Text style={styles.info}>Minták a felvételben: {samples.length}</Text>
        {recordingStartedAt && (
          <Text style={styles.info}>
            Felvétel kezdete: {new Date(recordingStartedAt).toLocaleString()}
          </Text>
        )}
        {recordingStoppedAt && !isRecording && (
          <Text style={styles.info}>
            Felvétel vége: {new Date(recordingStoppedAt).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef3f8',
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#12263a',
  },
  subtitle: {
    color: '#36566f',
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#001e3a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#12263a',
    marginBottom: 8,
  },
  row: {
    fontSize: 17,
    color: '#173042',
  },
  magnitude: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    color: '#1b6ca8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#204e7a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#b02a37',
  },
  stopButton: {
    backgroundColor: '#6c757d',
  },
  exportButton: {
    backgroundColor: '#157347',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  info: {
    color: '#45667d',
    fontSize: 13,
  },

    chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chartControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  smallButton: {
    backgroundColor: '#7a97b0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonActive: {
    backgroundColor: '#1b6ca8',
  },
  smallButtonInactive: {
    backgroundColor: '#7a97b0',
  },
  smallButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  chartInfo: {
    color: '#45667d',
    fontSize: 12,
    marginBottom: 8,
  },
});
