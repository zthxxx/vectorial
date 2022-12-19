import { Suspense, FC, lazy, ReactElement } from 'react'
import { useRoutes } from 'react-router-dom'
import { ErrorBoundary } from '@vectorial/whiteboard/components'
import { LoadingPage } from '@vectorial/whiteboard/pages'
import { vectorDebugger } from '@vectorial/whiteboard/model'

const SceneIdGuard = lazy(() => import('./pages/id-guard'))

const HomeLayout = lazy(() => import('./pages/layout'))
const SceneLayout = lazy(() => import('./pages/scene'))
const SceneView = lazy(() => import('./pages/scene/[id]'))


const useAppRoutes = (): ReactElement | null => {
  return useRoutes([
    {
      path: '/',
      element: (
        <SceneIdGuard routePath='/' resumeLastScene>
          <HomeLayout />
        </SceneIdGuard>
      ),
      children: [
        {
          path: 'scene',
          element: (
            <SceneIdGuard routePath='/scene'>
              <SceneLayout />
            </SceneIdGuard>
          ),
          children: [
            {
              path: ':id',
              element: (
                <SceneView />
              ),
            },
          ]
        },
      ],
    },
  ])
}

export const App: FC = () => {
  window.vectorDebugger = vectorDebugger

  return (
    <Suspense
      fallback={<LoadingPage />}
    >
      <ErrorBoundary>
        {useAppRoutes()}
      </ErrorBoundary>
    </Suspense>
  )
}
