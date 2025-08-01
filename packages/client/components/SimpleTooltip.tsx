import type {ReactNode} from 'react'
import {MenuPosition} from '../hooks/useCoords'
import useTooltip from '../hooks/useTooltip'
import {cn} from '../ui/cn'

interface Props {
  text: ReactNode
  children: ReactNode
  className?: string
}

const SimpleTooltip = (props: Props) => {
  const {text, children, className} = props
  const {openTooltip, closeTooltip, tooltipPortal, originRef} = useTooltip<HTMLDivElement>(
    MenuPosition.UPPER_CENTER
  )

  return (
    <div
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      className={cn('cursor-pointer', className)}
      ref={originRef}
    >
      {children}
      {tooltipPortal(text)}
    </div>
  )
}

export default SimpleTooltip
