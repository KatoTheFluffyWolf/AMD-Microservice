<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip)

const props = defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  totalVotes: {
    type: Number,
    default: 0,
  },
})

const canvas = ref(null)
let chart = null

const numberFormatter = new Intl.NumberFormat()
const chartHeight = computed(() => `${Math.max(14, props.options.length * 3.25)}rem`)

const chartSnapshot = computed(() =>
  props.options.map((option, index) => ({
    index: Number.isFinite(option?.index) ? option.index : index,
    text: String(option?.text ?? ''),
    votes: Number(option?.votes ?? 0),
  })),
)

function optionPercentage(option) {
  const suppliedPercentage = Number(option?.percentage)
  if (Number.isFinite(suppliedPercentage)) return suppliedPercentage
  return props.totalVotes > 0 ? (Number(option?.votes ?? 0) / props.totalVotes) * 100 : 0
}

function formattedPercentage(option) {
  return `${optionPercentage(option).toFixed(1)}%`
}

function syncChart() {
  if (!canvas.value) return

  const labels = chartSnapshot.value.map((option) => option.text)
  const votes = chartSnapshot.value.map((option) => option.votes)

  if (!chart) {
    chart = new Chart(canvas.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Votes',
            data: votes,
            backgroundColor: '#5b47e0',
            borderColor: '#4432bd',
            borderWidth: 1,
            borderRadius: 7,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 450,
          easing: 'easeOutQuart',
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            grid: {
              color: '#e7e9f1',
            },
          },
          y: {
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${numberFormatter.format(context.parsed.x)} votes`,
            },
          },
        },
      },
    })

    return
  }

  chart.data.labels = labels
  chart.data.datasets[0].data = votes
  chart.update()
}

onMounted(syncChart)

watch(chartSnapshot, syncChart, { deep: true })

onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div class="results-chart">
    <div class="results-chart__canvas" :style="{ height: chartHeight }">
      <canvas ref="canvas" role="img" aria-label="Horizontal bar chart of poll vote counts">
        Poll results chart
      </canvas>
    </div>

    <div class="results-table-wrap">
      <table>
        <caption>
          Poll results by answer option
        </caption>
        <thead>
          <tr>
            <th scope="col">Answer</th>
            <th scope="col">Votes</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="option in chartSnapshot" :key="option.index">
            <th scope="row">{{ option.text }}</th>
            <td>{{ numberFormatter.format(option.votes) }}</td>
            <td>{{ formattedPercentage(option) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.results-chart {
  display: grid;
  gap: var(--space-6);
}

.results-chart__canvas {
  position: relative;
  width: 100%;
  min-height: 14rem;
}

.results-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  font-size: 0.92rem;
}

caption {
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  font-size: 0.82rem;
  font-weight: 750;
  text-align: left;
}

th,
td {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  text-align: left;
}

thead th {
  color: var(--color-text-muted);
  background: #fbfbfd;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

tbody th {
  color: var(--color-text);
  font-weight: 700;
}

td {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 31rem) {
  th,
  td {
    padding: var(--space-3);
  }
}
</style>
