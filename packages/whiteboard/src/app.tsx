import { Suspense, FC, lazy, ReactElement } from 'react'
import { useRoutes } from 'react-router-dom'
import { LoadingPage } from '@vectorial/whiteboard/pages'

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
  return (
    <Suspense
      fallback={<LoadingPage />}
    >
      {useAppRoutes()}
    </Suspense>
  )
}
