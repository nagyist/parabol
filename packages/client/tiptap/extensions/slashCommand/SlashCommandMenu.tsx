import {SuggestionProps} from '@tiptap/suggestion'
import React, {forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState} from 'react'
import type {SlashCommandGroup} from './slashCommands'

export const SlashCommandMenu = forwardRef(
  (
    props: SuggestionProps<
      SlashCommandGroup,
      {action: SlashCommandGroup['commands'][number]['action']}
    >,
    ref
  ) => {
    const {items} = props
    const [selectedIndex, setSelectedIndex] = useState(0)
    const activeRef = useRef<HTMLDivElement>(null)
    const flatItems = items.flatMap((item) => item.commands)
    const activeItem = flatItems[selectedIndex]
    const selectItem = (idx: number) => {
      const item = flatItems[idx]
      if (!item) return
      const {action} = item
      props.command({action})
    }

    const upHandler = () => {
      setSelectedIndex((selectedIndex + flatItems.length - 1) % flatItems.length)
    }

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % flatItems.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [items])
    useEffect(() => {
      activeRef.current?.scrollIntoView({block: 'nearest'})
    }, [activeRef.current])
    useImperativeHandle(ref, () => ({
      onKeyDown: ({event}: {event: React.KeyboardEvent}) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          enterHandler()
          return true
        }
        return false
      }
    }))

    if (!items.length) return null
    return (
      <div className='border-rad z-10 max-h-56 overflow-auto rounded-md bg-white py-1 shadow-lg outline-none [[data-placement="bottom-start"]_&]:animate-slideDown [[data-placement="top-start"]_&]:animate-slideUp'>
        {items.map((item, idx) => (
          <Fragment key={item.group}>
            <div className='mx-1 px-3 py-1 text-xs font-semibold'>{item.group}</div>
            {item.commands.map((command) => (
              <div className='mx-1 flex' key={command.title}>
                <div
                  ref={command === activeItem ? activeRef : undefined}
                  data-highlighted={command === activeItem}
                  className={
                    ' group flex w-full cursor-pointer items-center space-x-2 rounded-md px-3 py-2 text-sm leading-8 text-slate-700 outline-none hover:!bg-slate-200 hover:text-slate-900 focus:bg-slate-200 data-highlighted:bg-slate-100 data-highlighted:text-slate-900'
                  }
                  onClick={() => selectItem(idx)}
                >
                  <div className='flex size-7 items-center justify-center rounded bg-slate-200 group-hover:bg-slate-300 group-data-highlighted:bg-slate-300'>
                    <command.icon className='size-5' />
                  </div>
                  <div className='flex flex-col text-sm'>
                    <span>{command.title}</span>
                    <span className='text-xs text-slate-600'>{command.description}</span>
                  </div>
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    )
  }
)
