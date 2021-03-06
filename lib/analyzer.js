/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var _ = require('underscore');



module.exports = function(_anl) {

  var findVms = function(sdef) {
    var vms = [];
    _.each(sdef.topology.containers, function(c) {
      var def = _.find(sdef.containerDefinitions, function(cdef) { return cdef.id === c.containerDefinitionId; });
      if (def.type === 'virtualbox' || def.type === 'aws-ami') {
        vms.push(c);
      }
    });
    return vms;
  };



  var createCompareList = function(vms, sys) {
    var list = [];
    _.each(vms, function(vm) {
      _.each(vm.contains, function(c) {
        list.push({id: c,
                   containedBy: sys.topology.containers[c].containedBy,
                   dockerImageId: sys.topology.containers[c].specific.dockerImageId,
                   containerDefinitionId: sys.topology.containers[c].containerDefinitionId});
      });
    });
    return list;
  };



  /**
   * pull matching ids from the system definition into the analyzed system topology
   * only for docker type containers 
   */
  var matchTopologyIds = function(system, analyzed) {
    var svms = findVms(system);
    var avms = findVms(analyzed);
    var sysCompareList = createCompareList(svms, system);
    var anCompareList = createCompareList(avms, analyzed);

    _.each(anCompareList, function(an) {
      var sys = _.find(sysCompareList, function(sys) { return sys.dockerImageId === an.dockerImageId; });
      if (sys) {
        if (an.id !== sys.id) {
          var oldId = analyzed.topology.containers[an.id].id;
          analyzed.topology.containers[an.id].id = sys.id;
          analyzed.topology.containers[sys.id] = analyzed.topology.containers[an.id]; // deep copy ??
          delete analyzed.topology.containers[an.id];

          var nc = _.without(analyzed.topology.containers[an.containedBy].contains, oldId);
          nc.push(sys.id);
          analyzed.topology.containers[an.containedBy].contains = nc;
        }
      }
    });
    return analyzed;
  };



  /**
   * pull matching ids from the system definition into the analyzed system container definintions
   * only for docker type containers 
   */
  var matchCDefIds = function(system, analyzed) {
    var scdefs = _.filter(system.containerDefinitions, function(cdef) { return cdef.type === 'docker' || cdef.type === 'boot2docker'; });
    var acdefs = _.filter(analyzed.containerDefinitions, function(cdef) { return cdef.type === 'docker' || cdef.type === 'boot2docker'; });

    _.each(acdefs, function(an) {
      var sys = _.find(scdefs, function(scdef) { return scdef.specific.dockerImageId === an.specific.dockerImageId; });
      if (sys) {
        an.id = sys.id;
      }
    });
    return analyzed;
  };



  /*
  var system = require('/Users/pelger/work/nearform/code/product/nfd/nfd-client/rev5.json');
  var analyzed = require('/Users/pelger/work/nearform/code/product/nfd/nfd-client/anl6.json');
  var res = matchTopologyIds(system, analyzed);
  res = matchCDefIds(system, res);
  console.log(JSON.stringify(res, null, 2));
  */



  var analyze = function analyze(config, system, cb) {
    _anl.analyze(config, function(err, result) {
      result = matchTopologyIds(system, result);
      result = matchCDefIds(system, result);
      cb(err, result);
    });
  };


  return {
    analyze: analyze
  };
};


module.exports(null);

