import {useRef} from 'react'
import useLoadingDelay from './useLoadingDelay'
import useModalPortal from './useModalPortal'
import usePortal, {type UsePortalOptions} from './usePortal'

interface Options extends UsePortalOptions {
  background?: string
  loadingWidth?: number
  noClose?: boolean
}

/**
 * Wrapper around {@link usePortal} for displaying dialogs
 */
const useModal = (options: Options = {}) => {
  const {background, onOpen, onClose, noClose, id, parentId} = options
  const targetRef = useRef<HTMLDivElement>(null)
  const {portal, closePortal, openPortal, togglePortal, portalStatus, setPortalStatus} = usePortal({
    id,
    parentId,
    onOpen,
    onClose,
    allowScroll: false
  })
  const {loadingDelay, loadingDelayRef} = useLoadingDelay()
  const modalPortal = useModalPortal(
    portal,
    targetRef,
    portalStatus,
    setPortalStatus,
    loadingDelayRef,
    noClose ? undefined : closePortal,
    background
  )
  return {
    togglePortal,
    modalPortal,
    closePortal,
    loadingDelay,
    openPortal,
    portalStatus
  }
}

export default useModal
