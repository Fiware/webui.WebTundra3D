// For conditions of distribution and use, see copyright notice in LICENSE

var cComponentTypeAnimation = 14;

/// Enumeration of animation phase
var AnimationPhase = {
    PHASE_FADEIN : 0,
    PHASE_PLAY : 1,
    PHASE_FADEOUT: 2,
    PHASE_STOP : 3,
    PHASE_FREE : 4 
};

// TODO not fully implemented.
function AnimationState() {
    
    /// Animation name.
    this.name = "";
    
    /// Autostop at end (default false)
    this.auto_stop = false;

    /// Time in milliseconds it takes to fade in/out an animation completely
    this.fade_period = 0.0;

    /// Weight of an animation in animation blending, maximum 1.0
    this.weight = 1.0;

    /// Weight adjust
    this.weight_factor = 1.0;

    /// How an animation is speed up or slowed down, default 1.0 (original speed)
    this.speed_factor = 1.0;

    /// loop animation through num_repeats times, or loop if zero
    this.num_repeats = 0;

    /// priority. high priority will reduce the weight of low priority animations, if exists on the same bone tracks
    this.priority = 0;

    /// current phase
    this.phase = AnimationPhase.PHASE_STOP;
    
};

function AnimationMeshInfo( animationController, mesh ) {
    
    this.animationController = animationController;
    this.mesh = mesh;
    
    this.onAssetReady = function ( mesh ) {
        
        animationController.createAnimations( this.mesh );
        
    };
    
    this.onComponentRemoved = function ( comp, changeType ) {
        
        if ( comp === this.mesh )
            this.release();
        
    };
    
    this.onAttributeChanged = function ( attr, changeType ) {
        ;
        if (attr.id === "meshRef")
            this.release();
        
    };
    
    this.release = function () {
        
        animationController.removeMesh( this.mesh );
        
        this.mesh.meshAssetReady.remove( this.onAssetReady, this );
        this.mesh.parentEntity.componentRemoved.remove( this.onComponentRemoved, this );
        this.mesh.attributeChanged.remove( this.onAttributeChanged, this );
        
        delete this.mesh;
        delete this.animationController;
        
    };
    
    this.mesh.parentEntity.componentRemoved.add( this.onComponentRemoved, this );
    this.mesh.attributeChanged.add( this.onAttributeChanged, this );
    
    if (mesh.assetReady)
        animationController.createAnimations( mesh );
    else
        this.mesh.meshAssetReady.addOnce( this.onAssetReady, this );
    
};

function EC_AnimationController() {
    Component.call(this, cComponentTypeAnimation);
    this.addAttribute(cAttributeString, "animationState", "", "");
    this.addAttribute(cAttributeBool, "drawDebug", "", false);

    // Map of animations that have their name as variable id.
    this.animations = new Object;
    
    // List of meshes we wish to animate.
    this.animatingMeshes = [];
}

EC_AnimationController.prototype = new Component(cComponentTypeAnimation);

// Play animation. If cross fade is set to true all playing animations are stopped
// and their fadeOutTime time is same as fadeInTime.
/* @param {string} animation name
 * @param {float} fadeInTime
 * @param {bool} crossFade
 * @param {bool} looped
 */
EC_AnimationController.prototype.play = function ( name, fadeInTime, crossFade, looped ) {};

// Play in loop animation
/* @param {string} animation name
 * @param {float} fadeInTime
 * @param {bool} crossFade
 */
EC_AnimationController.prototype.playLooped = function ( name, fadeInTime, crossFade )
{
    
    this.play( name, fadeInTime, crossFade, true );
    
};

// Stop playing given animation
// Implemention in EC_AnimationControllerView
/* @param {string} name Animation name
 * @param {float} fadeoutTime how long it takes to fade out the animation.
 */
EC_AnimationController.prototype.stop = function ( name, fadeoutTime ) {};

// Stop all playing animations
/* @param {float} fadeoutTime how long it takes to fade out the animations.
 */
EC_AnimationController.prototype.stopAll = function ( fadeoutTime )
{
    
     fadeoutTime = Number(fadeoutTime);
     fadeoutTime = isNaN(fadeoutTime) ? 0 : fadeoutTime;
     for(var id in this.animations) {

         anim = this.animations[id];
         if (anim instanceof AnimationState)
            this.stop(anim.name, fadeoutTime);

     }
    
};

// Updates animation(s) by elapsed time
// Implemention in EC_AnimationControllerView
/* @param {float} deltaTime time elapse.
 */
EC_AnimationController.prototype.update = function ( deltaTime ) {};

// Set new animation weight to animation
// Implemention in EC_AnimationControllerView
/*@param {string} name animation name.
 *@param {float} weight animation weight range [0-1].
 */
EC_AnimationController.prototype.setAnimWeight = function ( name, weight ) {};

// Implements the SetAnimSpeed action
// Implemention in EC_AnimationControllerView
/* @param {string} name animation name
 * @param {float} speed animation playback speed if negative play backward.
 */
EC_AnimationController.prototype.setAnimSpeed = function ( name, speed ) {};
    
// Create new instance of AnimationState object and add it to animations map.
/* @param {string} name animation name
 * @return {AnimationState} new animation state object.
 */
EC_AnimationController.prototype.createAnimation = function( name ) {
    
    var anim = new AnimationState();
    anim.name = name;
    this.animations[name] = anim;
    return anim;
    
};

// Add new mesh to animated by this component.
// Note! all meshes need to have identical skeleton defined.
EC_AnimationController.prototype.addMesh = function( mesh ) {
    
    for ( var i = 0; i < this.animatingMeshes.length; ++i ) {
    
        if ( this.animatingMeshes[i].mesh === mesh ) {
        
            return;
        
        }
    
    }
    
    var animationMesh = new AnimationMeshInfo( this, mesh );
    
    this.animatingMeshes.push(animationMesh);
    
};

// Remove mesh from animation controller.
/* @param {EC_Mesh} mesh that we dont want to animate
 */
EC_AnimationController.prototype.removeMesh = function( mesh ) {
    
    for ( var i = 0; i < this.animatingMeshes.length; ++i ) {
        
        if ( this.animatingMeshes[i].mesh === mesh ) {
            
            this.animatingMeshes.splice(i, 1);
            break;
            
        }
        
    }
    
};

// Get animation state object by name.
/* @param {string} animation name id
 * @return {AnimationState} return animation state object if found othervice
 *         return null.
 */
EC_AnimationController.prototype.animationState = function( name ) {
    
    var state;
    for ( var i in this.animations ) {
        
        state = this.animations[i];
        if ( state instanceof AnimationState ) {
            
            if (state.name === name)
                return state;
            
        }
        
    }
    return null;
    
};

// If new mesh components are added add them to animation controller.
EC_AnimationController.prototype.onComponentAdded = function ( newComp, changeType ) {
    
    if (newComp instanceof EC_Mesh)
        addMesh(newComp);
    
};

EC_AnimationController.prototype.createAnimations = function( mesh ) {};

registerComponent(cComponentTypeAnimation, "AnimationController", function(){ return new EC_AnimationController(); });