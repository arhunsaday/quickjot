import { PencilLine, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  title: string
  detail: string
}

/**
 * Shown when a shared link cannot be decoded. The previous build threw during
 * render here and left a blank white page; receiving a damaged link is a normal
 * thing, so it gets a real explanation and a way forward.
 */
export function LoadFailure({ title, detail }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <TriangleAlert className="text-warning size-6 shrink-0" />
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <CardDescription className="pt-2 text-base">{detail}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              window.location.href = window.location.pathname
            }}
          >
            <PencilLine />
            Start a new note
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
