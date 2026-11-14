// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View

/** Fine diamond net (DESIGN.md §5) behind the head of the alarm screen – decorative only. */
class NetPatternView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private val density = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = STROKE_DP * density
        color = context.getColor(de.uebungsleiter.tracker.R.color.hl_alarm_text)
        alpha = ALPHA
    }

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val step = STEP_DP * density
        val w = width.toFloat()
        val h = height.toFloat()
        var x = -h
        while (x < w + h) {
            canvas.drawLine(x, 0f, x + h, h, paint)
            canvas.drawLine(x, h, x + h, 0f, paint)
            x += step
        }
    }

    private companion object {
        const val STEP_DP = 14f
        const val STROKE_DP = 1.25f
        const val ALPHA = 13 // ≈ 5 % of 255
    }
}
