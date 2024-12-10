import {ReactNode} from 'react'
import {Button} from '../../ui/Button/Button'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  children: ReactNode
}
export const BubbleMenuButton = (props: Props) => {
  const {children, isActive, ...rest} = props
  return (
    <Button
      variant='flat'
      data-highlighted={isActive}
      className='h-5 w-5 rounded-sm py-1 hover:bg-slate-300 data-highlighted:bg-slate-300'
      {...rest}
    >
      {children}
    </Button>
  )
}