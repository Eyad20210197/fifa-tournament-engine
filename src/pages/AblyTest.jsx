import { RamadanStage } from '../components/common/RamadanStage'
import AblyTestPanel from '../components/dev/AblyTestPanel'

export default function AblyTest() {
  return (
    <RamadanStage>
      <div className="px-4 py-6">
        <AblyTestPanel />
      </div>
    </RamadanStage>
  )
}
