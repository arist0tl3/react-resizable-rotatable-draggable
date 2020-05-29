import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { getLength, getAngle, getCursor } from '../utils'
import StyledRect from './StyledRect'

const zoomableMap = {
  'n': 't',
  's': 'b',
  'e': 'r',
  'w': 'l',
  'ne': 'tr',
  'nw': 'tl',
  'se': 'br',
  'sw': 'bl'
}

export default class Rect extends PureComponent {
  static propTypes = {
    styles: PropTypes.object,
    zoomable: PropTypes.string,
    rotatable: PropTypes.bool,
    onResizeStart: PropTypes.func,
    onResize: PropTypes.func,
    onResizeEnd: PropTypes.func,
    onRotateStart: PropTypes.func,
    onRotate: PropTypes.func,
    onRotateEnd: PropTypes.func,
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onDragEnd: PropTypes.func,
    parentRotateAngle: PropTypes.number
  }

  setElementRef = (ref) => { this.$element = ref }

  // Drag
  startDrag = (e) => {
    e.preventDefault();
    let { clientX: startX, clientY: startY } = e
    this.props.onDragStart && this.props.onDragStart()
    this._isPointerDown = true
    const onMove = (e) => {
      e.preventDefault();
      if (!this._isPointerDown) return // patch: fix windows press win key during pointerup issue
      e.stopImmediatePropagation()
      const { clientX, clientY } = e
      const deltaX = clientX - startX
      const deltaY = clientY - startY
      this.props.onDrag(deltaX, deltaY)
      startX = clientX
      startY = clientY
    }
    const onUp = (e) => {
      e.preventDefault();
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!this._isPointerDown) return
      this._isPointerDown = false
      this.props.onDragEnd && this.props.onDragEnd()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Rotate
  startRotate = (e) => {
    e.preventDefault();
    if (e.button !== 0) return
    const { clientX, clientY } = e
    const { styles: { transform: { rotateAngle: startAngle } } } = this.props
    const rect = this.$element.getBoundingClientRect()
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
    const startVector = {
      x: clientX - center.x,
      y: clientY - center.y
    }
    this.props.onRotateStart && this.props.onRotateStart()
    this._isPointerDown = true
    const onMove = (e) => {
      e.preventDefault();
      if (!this._isPointerDown) return // patch: fix windows press win key during pointerup issue
      e.stopImmediatePropagation()
      const { clientX, clientY } = e
      const rotateVector = {
        x: clientX - center.x,
        y: clientY - center.y
      }
      const angle = getAngle(startVector, rotateVector)
      this.props.onRotate(angle, startAngle)
    }
    const onUp = (e) => {
      e.preventDefault();
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!this._isPointerDown) return
      this._isPointerDown = false
      this.props.onRotateEnd && this.props.onRotateEnd()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Resize
  startResize = (e, cursor) => {
    e.preventDefault();
    if (e.button !== 0) return
    document.body.style.cursor = cursor
    const { styles: { position: { centerX, centerY }, size: { width, height }, transform: { rotateAngle } } } = this.props
    const { clientX: startX, clientY: startY } = e
    const rect = { width, height, centerX, centerY, rotateAngle }
    const type = e.target.getAttribute('class').split(' ')[ 0 ]
    this.props.onResizeStart && this.props.onResizeStart()
    this._isPointerDown = true
    const onMove = (e) => {
      e.preventDefault();
      if (!this._isPointerDown) return // patch: fix windows press win key during pointerup issue
      e.stopImmediatePropagation()
      const { clientX, clientY } = e
      const deltaX = clientX - startX
      const deltaY = clientY - startY
      const alpha = Math.atan2(deltaY, deltaX)
      const deltaL = getLength(deltaX, deltaY)
      const isShiftKey = e.shiftKey
      this.props.onResize(deltaL, alpha, rect, type, isShiftKey)
    }

    const onUp = (e) => {
      e.preventDefault();
      document.body.style.cursor = 'auto'
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!this._isPointerDown) return
      this._isPointerDown = false
      this.props.onResizeEnd && this.props.onResizeEnd()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  render () {
    const {
      styles: {
        position: { centerX, centerY },
        size: { width, height },
        transform: { rotateAngle }
      },
      zoomable,
      rotatable,
      parentRotateAngle
    } = this.props
    const style = {
      width: Math.abs(width),
      height: Math.abs(height),
      transform: `rotate(${rotateAngle}deg)`,
      left: centerX - Math.abs(width) / 2,
      top: centerY - Math.abs(height) / 2
    }
    const direction = zoomable.split(',').map(d => d.trim()).filter(d => d) // TODO: may be speed up

    return (
      <StyledRect
        ref={this.setElementRef}
        onPointerDown={this.startDrag}
        className="rect single-resizer"
        style={style}
      >
        {
          rotatable &&
          <div className="rotate" onPointerDown={this.startRotate}>
            <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.536 3.464A5 5 0 1 0 11 10l1.424 1.425a7 7 0 1 1-.475-9.374L13.659.34A.2.2 0 0 1 14 .483V5.5a.5.5 0 0 1-.5.5H8.483a.2.2 0 0 1-.142-.341l2.195-2.195z"
                fill="#eb5648"
                fillRule="nonzero"
              />
            </svg>
          </div>
        }

        {
          direction.map(d => {
            const cursor = `${getCursor(rotateAngle + parentRotateAngle, d)}-resize`
            return (
              <div key={d} style={{ cursor }} className={`${zoomableMap[ d ]} resizable-handler`} onPointerDown={(e) => this.startResize(e, cursor)} />
            )
          })
        }

        {
          direction.map(d => {
            return (
              <div key={d} className={`${zoomableMap[ d ]} square`} />
            )
          })
        }
      </StyledRect>
    )
  }
}
