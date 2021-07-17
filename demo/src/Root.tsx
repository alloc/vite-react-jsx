// PROBLEM: This is an alias path set in tsconfig.json
// This points to src/shared/ui which has an index.ts file that exports stuff
import { File } from '@/shared/ui'

export const Root = () => {
  return <File />
}
