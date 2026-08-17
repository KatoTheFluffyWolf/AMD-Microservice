import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ResultsChart from '@/components/ResultsChart.vue'

const chartMock = vi.hoisted(() => ({
  instances: [],
  register: vi.fn(),
}))

vi.mock('chart.js', () => {
  class MockChart {
    static register(...items) {
      chartMock.register(...items)
    }

    constructor(_canvas, configuration) {
      this.data = configuration.data
      this.options = configuration.options
      this.update = vi.fn()
      this.destroy = vi.fn()
      chartMock.instances.push(this)
    }
  }

  return {
    Chart: MockChart,
    BarController: {},
    BarElement: {},
    CategoryScale: {},
    LinearScale: {},
    Legend: {},
    Tooltip: {},
  }
})

describe('ResultsChart', () => {
  it('updates one chart instance and destroys it when unmounted', async () => {
    chartMock.instances.length = 0
    const wrapper = mount(ResultsChart, {
      props: {
        options: [
          { index: 0, text: 'Monday', votes: 1, percentage: 100 },
          { index: 1, text: 'Tuesday', votes: 0, percentage: 0 },
        ],
        totalVotes: 1,
      },
    })

    expect(chartMock.instances).toHaveLength(1)
    const chart = chartMock.instances[0]

    await wrapper.setProps({
      options: [
        { index: 0, text: 'Monday', votes: 2, percentage: 40 },
        { index: 1, text: 'Tuesday', votes: 3, percentage: 60 },
      ],
      totalVotes: 5,
    })

    expect(chartMock.instances).toHaveLength(1)
    expect(chart.data.datasets[0].data).toEqual([2, 3])
    expect(chart.update).toHaveBeenCalled()

    wrapper.unmount()
    expect(chart.destroy).toHaveBeenCalledOnce()
  })

  it('shows accessible zero-vote values in its textual table', () => {
    chartMock.instances.length = 0
    const wrapper = mount(ResultsChart, {
      props: {
        options: [{ index: 0, text: 'No votes yet', votes: 0 }],
        totalVotes: 0,
      },
    })

    expect(wrapper.get('caption').text()).toBe('Poll results by answer option')
    expect(wrapper.get('tbody').text()).toContain('No votes yet')
    expect(wrapper.get('tbody').text()).toContain('0.0%')
    wrapper.unmount()
  })
})
